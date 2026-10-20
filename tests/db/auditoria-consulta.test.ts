import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { BOM } from "@/lib/csv";
import { updateEstudanteDados } from "@/modules/academico/services/estudante-service";
import { EXPORTACAO_LIMITE, exportarRegistros, listRegistros } from "@/modules/administracao/services/auditoria-service";
import { createAccessScenario, createEstudante, createUsuario, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const PAGINA = { page: 1, limit: 100 };

describe("audit trail query (RF066)", () => {
  let s: Scenario;
  let estudanteId: string;

  beforeAll(async () => {
    s = await createAccessScenario();
    const pessoa = await createUsuario();
    estudanteId = (await createEstudante(pessoa.id, s.cursoA.id)).id;
    await updateEstudanteDados(identityOf(s.coordenadorA.id), estudanteId, { periodo: 6 });
  });

  it("filters by record and returns the author with the data before and after", async () => {
    const { items, total } = await listRegistros(identityOf(s.administrador.id), { tabela: "estudante", registroId: estudanteId }, PAGINA);

    expect(total).toBe(2);
    expect(items.map((item) => item.operacao)).toEqual(["UPDATE", "INSERT"]);
    expect(items[0]).toMatchObject({
      usuarioId: s.coordenadorA.id,
      autorNome: s.coordenadorA.nome,
      camposAlterados: expect.arrayContaining(["periodo"]),
      dadosNovos: expect.objectContaining({ periodo: 6 }),
    });
    // the fixture inserted as the owner, outside the application: no author
    expect(items[1].usuarioId).toBeNull();
  });

  it("filters by author and operation", async () => {
    const { items } = await listRegistros(
      identityOf(s.administrador.id),
      { usuarioId: s.coordenadorA.id, operacao: "UPDATE" },
      PAGINA,
    );

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.usuarioId === s.coordenadorA.id && item.operacao === "UPDATE")).toBe(true);
  });

  it("treats the date range as whole days in the institution's time zone", async () => {
    const [{ hoje }] = (
      await owner().execute<{ hoje: string }>(sql`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje`)
    ).rows;
    const filtro = { tabela: "estudante", registroId: estudanteId };

    const doDia = await listRegistros(identityOf(s.administrador.id), { ...filtro, de: hoje, ate: hoje }, PAGINA);
    const antes = await listRegistros(identityOf(s.administrador.id), { ...filtro, ate: "2000-01-01" }, PAGINA);

    expect(doDia.total).toBe(2);
    expect(antes.total).toBe(0);
  });

  it("shows an empty trail to every other profile", async () => {
    for (const quem of [s.coordenadorA, s.alunoA, s.semPerfil]) {
      const { items, total } = await listRegistros(identityOf(quem.id), {}, PAGINA);
      expect(items).toEqual([]);
      expect(total).toBe(0);
    }
  });
});

describe("audit trail export (RF066)", () => {
  let s: Scenario;
  let estudanteId: string;

  beforeAll(async () => {
    s = await createAccessScenario();
    const pessoa = await createUsuario();
    estudanteId = (await createEstudante(pessoa.id, s.cursoA.id)).id;
    // a value a spreadsheet would run as a formula, written through the application
    await updateEstudanteDados(identityOf(s.administrador.id), estudanteId, { matricula: `=1+1-${estudanteId.slice(0, 6)}` });
  });

  it("exports the filtered rows as CSV with a BOM and neutralized formulas", async () => {
    const csv = await exportarRegistros(identityOf(s.administrador.id), { tabela: "estudante", registroId: estudanteId });
    const linhas = csv.split("\r\n");

    expect(csv.startsWith(BOM)).toBe(true);
    expect(linhas[0]).toBe(
      `${BOM}"id";"ocorrido_em";"operacao";"tabela";"registro_id";"usuario_id";"autor_nome";"autor_email";"campos_alterados";"dados_anteriores";"dados_novos"`,
    );
    expect(linhas.filter(Boolean)).toHaveLength(3);
    expect(csv).toContain(`"${s.administrador.nome}"`);
    // the formula sits inside the JSON of the row, so no cell starts with "="
    expect(linhas.some((linha) => linha.split(";").some((celula) => celula.startsWith('"=')))).toBe(false);
  });

  it("refuses an export over the limit instead of cutting it", async () => {
    const [{ total }] = (await owner().execute<{ total: number }>(sql`select count(*)::int as total from auditoria`)).rows;
    if (total <= EXPORTACAO_LIMITE) {
      // inflate the trail with audited updates of one row until the limit is crossed
      const faltam = EXPORTACAO_LIMITE - total + 1;
      const pessoa = await createUsuario();
      const alvo = await createEstudante(pessoa.id, s.cursoA.id);
      await owner().execute(sql`
        do $$ begin
          for i in 1..${sql.raw(String(faltam))} loop
            update public.estudante set periodo = 1 + (i % 19) where id = ${sql.raw(`'${alvo.id}'`)};
          end loop;
        end $$
      `);
    }

    await expect(exportarRegistros(identityOf(s.administrador.id), {})).rejects.toMatchObject({
      code: "EXPORTACAO_EXCEDE_LIMITE",
      kind: "UNPROCESSABLE",
    });
  });

  it("exports nothing but the header to a non-administrator", async () => {
    const csv = await exportarRegistros(identityOf(s.coordenadorA.id), {});
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});
