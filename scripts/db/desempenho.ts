import { performance } from "node:perf_hooks";
import { Client } from "pg";
import type { Identity } from "@/lib/identity";
import { closeDatabases } from "@/db/client";
import { getCargaHoraria, listEstagiosDivergentes, listFrequencias } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { applyMigrations } from "./apply-migrations";

// Load and latency measurement of the follow-up reads (RNF-11: p95 of 2 s; team target
// p95 < 800 ms). Builds, once, two courses with 300 ATIVO internships each since 2026-03-02,
// one entry per business day until yesterday (~100k entries, half homologated) and the
// generated reports, then times the services exactly as the API calls them, under RLS, for
// each profile. Runs only against a *_test database: npm run db:desempenho.

const MARCA = "CARGA-DESEMPENHO";
const ESTAGIOS_POR_CURSO = 300;
const ORIENTADORES_POR_CURSO = 10;
const SUPERVISORES_POR_CURSO = 30;
// DESEMPENHO_REPETICOES shortens a run (e.g. a baseline before an optimization)
const REPETICOES = Number(process.env.DESEMPENHO_REPETICOES ?? 40);
const AQUECIMENTO = Math.min(5, Math.max(1, Math.floor(REPETICOES / 8)));

function exigirBancoDeTeste() {
  for (const variavel of ["DATABASE_URL", "DATABASE_MIGRATION_URL"]) {
    const nome = new URL(process.env[variavel] ?? "postgres://x/").pathname.slice(1);
    if (!nome.endsWith("_test")) throw new Error(`${variavel} aponta para "${nome}"; a carga só roda em banco *_test`);
  }
}

// The whole volume in one transaction as the owner: rows go through the same triggers the
// application uses (limits, homologation totals, report generation), so the data is valid.
const CARGA_SQL = `
do $carga$
declare
  v_curso uuid; v_coordenador uuid; v_concedente uuid; v_convenio uuid; v_documento uuid;
  v_orientadores uuid[]; v_supervisores uuid[]; v_estagio uuid; v_aluno uuid; v_estudante uuid; v_usuario uuid;
  c int; i int;
begin
  for c in 1..2 loop
    insert into public.curso (codigo, nome, carga_minima_estagio_minutos, carga_atividades_complementares_minutos)
      values ('${MARCA}-' || c, 'Curso de carga ' || c, 400 * 60, 200 * 60) returning id into v_curso;
    insert into public.usuario (nome, email) values ('Coordenação carga ' || c, 'coordenacao-carga-' || c || '@carga.local') returning id into v_coordenador;
    insert into public.vinculo_perfil (usuario_id, perfil, curso_id) values (v_coordenador, 'COORDENACAO', v_curso);

    insert into public.concedente (razao_social, cnpj, logradouro, numero_endereco, bairro, municipio, uf, cep, email_contato, representante_legal_nome, area_atuacao)
      values ('Concedente de carga ' || c, lpad((90000000000000 + c)::text, 14, '0'), 'Rua', '1', 'Centro', 'Maceió', 'AL', '57000000', 'carga' || c || '@carga.local', 'Representante', 'Tecnologia')
      returning id into v_concedente;
    insert into public.documento (tipo, chave_objeto, nome_original, tipo_mime, tamanho_bytes, sha256, concedente_id, enviado_por_usuario_id)
      values ('CONVENIO', 'documentos/carga-' || c || '.pdf', 'convenio.pdf', 'application/pdf', 100, repeat('0', 64), v_concedente, v_coordenador)
      returning id into v_documento;
    insert into public.convenio (concedente_id, numero) values (v_concedente, '${MARCA}-' || c) returning id into v_convenio;
    insert into public.convenio_vigencia (convenio_id, vigencia_inicio, vigencia_fim, documento_id, registrado_por_usuario_id)
      values (v_convenio, '2026-01-01', '2030-12-31', v_documento, v_coordenador);

    v_orientadores := array[]::uuid[];
    for i in 1..${ORIENTADORES_POR_CURSO} loop
      insert into public.usuario (nome, email) values ('Orientador ' || c || '-' || i, 'orientador-' || c || '-' || i || '@carga.local') returning id into v_usuario;
      insert into public.vinculo_perfil (usuario_id, perfil) values (v_usuario, 'PROFESSOR_ORIENTADOR');
      v_orientadores := v_orientadores || v_usuario;
    end loop;
    v_supervisores := array[]::uuid[];
    for i in 1..${SUPERVISORES_POR_CURSO} loop
      insert into public.usuario (nome, email) values ('Supervisor ' || c || '-' || i, 'supervisor-' || c || '-' || i || '@carga.local') returning id into v_usuario;
      insert into public.vinculo_perfil (usuario_id, perfil, concedente_id) values (v_usuario, 'SUPERVISOR', v_concedente);
      v_supervisores := v_supervisores || v_usuario;
    end loop;

    for i in 1..${ESTAGIOS_POR_CURSO} loop
      insert into public.usuario (nome, email) values ('Estudante ' || c || '-' || i, 'estudante-' || c || '-' || i || '@carga.local') returning id into v_aluno;
      insert into public.vinculo_perfil (usuario_id, perfil) values (v_aluno, 'ESTUDANTE');
      insert into public.estudante (usuario_id, curso_id, matricula, periodo) values (v_aluno, v_curso, 'CARGA-' || c || '-' || i, 5) returning id into v_estudante;
      insert into public.estagio (estudante_id, curso_id, concedente_id, convenio_id, tipo, situacao, data_inicio, data_fim_pactuada, data_fim_prevista,
                                  carga_diaria_minutos, carga_semanal_minutos, carga_total_minutos, condicoes_pactuadas, hash_tce, tce_fechado_em,
                                  ativado_em, criado_por_usuario_id)
        values (v_estudante, v_curso, v_concedente, v_convenio, 'OBRIGATORIO', 'ATIVO', '2026-03-02', '2027-02-26', '2027-02-26',
                360, 1800, 400 * 60, 'Carga de desempenho', repeat('a', 64), now(), now(), v_coordenador)
        returning id into v_estagio;
      insert into public.responsavel_estagio (estagio_id, papel, usuario_id, vigencia_inicio, decidido_por_usuario_id) values
        (v_estagio, 'ORIENTADOR', v_orientadores[1 + (i % ${ORIENTADORES_POR_CURSO})], '2026-03-02', v_coordenador),
        (v_estagio, 'SUPERVISOR', v_supervisores[1 + (i % ${SUPERVISORES_POR_CURSO})], '2026-03-02', v_coordenador);
      perform app.gerar_relatorios(v_estagio);

      -- One entry per business day until yesterday; a few students stop in September, so the
      -- divergence listing has something to find
      insert into public.registro_frequencia (estagio_id, data, hora_entrada, hora_saida, intervalo_minutos, duracao_minutos,
                                              registrado_por_usuario_id, limite_diario_aplicado_minutos, limite_semanal_aplicado_minutos)
        select v_estagio, d::date, '13:00', '19:00', 0, 360, v_aluno, 1, 1
        from generate_series('2026-03-02'::date, app.hoje() - 1, interval '1 day') d
        where extract(isodow from d) < 6 and (i % 10 <> 0 or d < '2026-09-01');
    end loop;
  end loop;

  -- Supervisors homologate everything until the end of July, one homologation per internship
  insert into public.homologacao_frequencia (id, estagio_id, periodo_inicio, periodo_fim, minutos_homologados, homologado_por_usuario_id)
    select gen_random_uuid(), g.id, '2026-03-02', '2026-07-31',
           (select sum(r.duracao_minutos) from public.registro_frequencia r where r.estagio_id = g.id and r.data <= '2026-07-31'),
           (select r.usuario_id from public.responsavel_estagio r where r.estagio_id = g.id and r.papel = 'SUPERVISOR')
    from public.estagio g join public.curso c on c.id = g.curso_id
    where c.codigo like '${MARCA}-%';
  update public.registro_frequencia r
     set situacao = 'HOMOLOGADO', homologacao_id = h.id
    from public.homologacao_frequencia h
   where h.estagio_id = r.estagio_id and r.data between h.periodo_inicio and h.periodo_fim
     and h.estagio_id in (select g.id from public.estagio g join public.curso c on c.id = g.curso_id where c.codigo like '${MARCA}-%');
end
$carga$;
`;

type Medicao = { consulta: string; perfil: string; linhas: number; p50: number; p95: number; max: number };

async function medir(consulta: string, perfil: string, executar: () => Promise<unknown[] | object>): Promise<Medicao> {
  let linhas = 0;
  for (let i = 0; i < AQUECIMENTO; i++) await executar();
  const tempos: number[] = [];
  for (let i = 0; i < REPETICOES; i++) {
    const inicio = performance.now();
    const resultado = await executar();
    tempos.push(performance.now() - inicio);
    linhas = Array.isArray(resultado) ? resultado.length : 1;
  }
  tempos.sort((a, b) => a - b);
  const percentil = (p: number) => tempos[Math.min(tempos.length - 1, Math.ceil((p / 100) * tempos.length) - 1)];
  return { consulta, perfil, linhas, p50: percentil(50), p95: percentil(95), max: tempos.at(-1)! };
}

async function main() {
  exigirBancoDeTeste();
  const owner = new Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
  await owner.connect();
  try {
    await applyMigrations(process.env.DATABASE_MIGRATION_URL!);
    const { rows: existentes } = await owner.query(`select 1 from public.curso where codigo = '${MARCA}-1'`);
    if (existentes.length === 0) {
      const inicio = performance.now();
      await owner.query("begin");
      await owner.query(CARGA_SQL);
      await owner.query("commit");
      console.log(`carga criada em ${((performance.now() - inicio) / 1000).toFixed(1)} s`);
    }
    const { rows: volume } = await owner.query<{ tabela: string; linhas: string }>(`
      select 'estagio' as tabela, count(*)::text as linhas from public.estagio
      union all select 'registro_frequencia', count(*)::text from public.registro_frequencia
      union all select 'relatorio', count(*)::text from public.relatorio
      union all select 'responsavel_estagio', count(*)::text from public.responsavel_estagio`);
    console.table(volume);

    const pessoa = async (email: string) => {
      const { rows } = await owner.query<{ id: string }>("select id from public.usuario where email = $1", [email]);
      return { userId: rows[0].id } as Identity;
    };
    const { rows: alvo } = await owner.query<{ id: string; aluno: string; orientador: string; supervisor: string }>(`
      select g.id, e.usuario_id as aluno,
             (select r.usuario_id from public.responsavel_estagio r where r.estagio_id = g.id and r.papel = 'ORIENTADOR') as orientador,
             (select r.usuario_id from public.responsavel_estagio r where r.estagio_id = g.id and r.papel = 'SUPERVISOR') as supervisor
      from public.estagio g join public.estudante e on e.id = g.estudante_id
      where e.matricula = 'CARGA-1-7'`);
    const estagioId = alvo[0].id;
    const aluno = { userId: alvo[0].aluno } as Identity;
    const orientador = { userId: alvo[0].orientador } as Identity;
    const supervisor = { userId: alvo[0].supervisor } as Identity;
    const coordenacao = await pessoa("coordenacao-carga-1@carga.local");

    const medicoes: Medicao[] = [];
    medicoes.push(await medir("GET /estagios/{id}/frequencias", "estudante", () => listFrequencias(aluno, estagioId, {})));
    medicoes.push(await medir("GET /estagios/{id}/frequencias", "supervisor", () => listFrequencias(supervisor, estagioId, {})));
    medicoes.push(await medir("GET /estagios/{id}/frequencias", "coordenação", () => listFrequencias(coordenacao, estagioId, {})));
    medicoes.push(await medir("GET /estagios/{id}/carga-horaria", "orientador", () => getCargaHoraria(orientador, estagioId)));
    medicoes.push(await medir("GET /estagios/divergencias", "orientador (30 estágios)", () => listEstagiosDivergentes(orientador)));
    medicoes.push(await medir("GET /estagios/divergencias", "coordenação (300 estágios)", () => listEstagiosDivergentes(coordenacao)));
    medicoes.push(await medir("GET /relatorios/pendentes", "coordenação (300 estágios)", () => listRelatoriosPendentes(coordenacao)));
    medicoes.push(await medir("GET /estagios?limit=100", "coordenação (300 estágios)", async () => (await listEstagios(coordenacao, { page: 1, limit: 100 })).items));
    console.table(
      medicoes.map((m) => ({ consulta: m.consulta, perfil: m.perfil, linhas: m.linhas, "p50 (ms)": m.p50.toFixed(1), "p95 (ms)": m.p95.toFixed(1), "max (ms)": m.max.toFixed(1) })),
    );
  } finally {
    await owner.end();
    await closeDatabases();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
