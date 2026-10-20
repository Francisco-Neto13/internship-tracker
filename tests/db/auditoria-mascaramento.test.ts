import { sql } from "drizzle-orm";
import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { owner } from "./fixtures";

// AGENTS.md: the administrator reads the audit trail but never report or medical-leave
// content (RN-38, RF071). app.coluna_sensivel lists those columns before their tables
// exist (Fase 3 and 5), so the masking holds from the first row they receive.

type Registro = { dados_anteriores: Record<string, unknown> | null; dados_novos: Record<string, unknown> | null; campos_alterados: string[] | null };

/** Runs `corpo` as the table owner inside a transaction that is always rolled back. */
async function emTransacaoRevertida<T>(corpo: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await client.connect();
  try {
    await client.query("begin");
    return await corpo(client);
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

describe("sensitive columns masked in the audit trail (RN-38, RF071)", () => {
  it("registers the report and medical-leave content columns before their tables exist", async () => {
    const { rows } = await owner().execute<{ tabela: string; coluna: string }>(
      sql`select tabela, coluna from app.coluna_sensivel order by tabela, coluna`,
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        { tabela: "afastamento", coluna: "descricao" },
        { tabela: "parecer_relatorio", coluna: "texto" },
        { tabela: "versao_relatorio", coluna: "conteudo" },
      ]),
    );
  });

  it("records the change but never the content, on insert and update", async () => {
    const registros = await emTransacaoRevertida(async (client) => {
      // Stands in for a Fase 3 table: created, audited and registered the same way
      await client.query(`
        create table public.versao_relatorio (id uuid primary key default gen_random_uuid(), titulo text, conteudo text);
        alter table public.versao_relatorio enable row level security;
        create trigger registrar_auditoria after insert or update or delete on public.versao_relatorio
          for each row execute function app.registrar_auditoria();
      `);
      const {
        rows: [{ id }],
      } = await client.query<{ id: string }>(
        `insert into public.versao_relatorio (titulo, conteudo) values ('Relatório 1', 'diagnóstico sigiloso') returning id`,
      );
      await client.query(`update public.versao_relatorio set conteudo = 'outro texto sigiloso' where id = $1`, [id]);
      await client.query(`update public.versao_relatorio set titulo = 'Relatório 1b' where id = $1`, [id]);

      const { rows } = await client.query<Registro>(
        `select dados_anteriores, dados_novos, campos_alterados from public.auditoria where tabela = 'versao_relatorio' and registro_id = $1 order by id`,
        [id],
      );
      return rows;
    });

    const [insercao, alteracaoConteudo, alteracaoTitulo] = registros;
    expect(insercao.dados_novos).toMatchObject({ titulo: "Relatório 1", conteudo: "[omitido]" });
    expect(alteracaoConteudo.campos_alterados).toEqual(["conteudo"]);
    expect(alteracaoConteudo.dados_anteriores).toMatchObject({ conteudo: "[omitido]" });
    expect(alteracaoConteudo.dados_novos).toMatchObject({ conteudo: "[omitido]" });
    expect(alteracaoTitulo.dados_novos).toMatchObject({ titulo: "Relatório 1b", conteudo: "[omitido]" });
    expect(JSON.stringify(registros)).not.toContain("sigiloso");
  });

  it("keeps an empty sensitive column as null, so absence is not mistaken for content", async () => {
    const dados = await emTransacaoRevertida(async (client) => {
      await client.query(`
        create table public.afastamento (id uuid primary key default gen_random_uuid(), descricao text);
        alter table public.afastamento enable row level security;
        create trigger registrar_auditoria after insert on public.afastamento
          for each row execute function app.registrar_auditoria();
      `);
      await client.query(`insert into public.afastamento (descricao) values (null)`);
      const { rows } = await client.query<Registro>(`select dados_novos from public.auditoria where tabela = 'afastamento'`);
      return rows[0].dados_novos;
    });

    expect(dados).toMatchObject({ descricao: null });
  });

  it("only lists columns of audited tables, so a typo cannot silently disable the masking", async () => {
    const { rows } = await owner().execute<{ tabela: string; coluna: string; problema: string }>(sql`
      select s.tabela, s.coluna,
             case when col.column_name is null then 'coluna inexistente' else 'tabela sem auditoria' end as problema
        from app.coluna_sensivel s
        join information_schema.tables t on t.table_schema = 'public' and t.table_name = s.tabela
        left join information_schema.columns col
          on col.table_schema = 'public' and col.table_name = s.tabela and col.column_name = s.coluna
       where col.column_name is null
          or not exists (
            select 1 from pg_trigger tg
             where tg.tgrelid = ('public.' || s.tabela)::regclass and tg.tgname = 'registrar_auditoria'
          )
    `);

    expect(rows).toEqual([]);
  });
});
