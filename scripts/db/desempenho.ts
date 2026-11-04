import { performance } from "node:perf_hooks";
import { Client } from "pg";
import type { Identity } from "@/lib/identity";
import { closeDatabases } from "@/db/client";
import { getCargaHoraria, listEstagiosDivergentes, listFrequencias } from "@/modules/acompanhamento/services/frequencia-service";
import { VISOES_RELATORIO } from "@/modules/acompanhamento/domain/relatorio";
import { listRelatoriosPendentes, listRelatoriosPendentesPagina } from "@/modules/acompanhamento/services/relatorio-service";
import { listAtividades, listAtividadesPagina, listFilaAnalise, listFilaAnalisePagina } from "@/modules/atividades/services/atividade-service";
import { getIntegralizacao, getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { gerarRelatorio, exportarRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";
import { listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";
import { listAfastamentos } from "@/modules/estagios/services/afastamento-service";
import { pdfTce } from "@/modules/estagios/services/documento-estagio-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { applyMigrations } from "./apply-migrations";

// Load and latency measurement of the follow-up reads (RNF-11: p95 of 2 s; team target
// p95 < 800 ms). Builds, once, two courses with 300 ATIVO internships each since 2026-03-02,
// one entry per business day until yesterday (~100k entries, half homologated) and the
// generated reports; then (Fase 4) four categories per course and eight activities per
// student, five approved, which stores ~3k assessments through the same triggers; then
// (Fase 5) a weekend leave per internship, 30 rescissions per course and an administrator. Times the
// services exactly as the API calls them, under RLS, for each profile. Runs only against a
// *_test database: npm run db:desempenho.

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

// Fase 5: a weekend leave per internship (no entries on those days), the rescission of every
// tenth internship of each course on 2026-10-30, and an administrator, through the M04 triggers
const CARGA_FASE5_SQL = `
do $carga5$
declare
  v_estagio record; v_documento uuid; v_admin uuid;
begin
  insert into public.usuario (nome, email) values ('Administração carga', 'admin-carga@carga.local') returning id into v_admin;
  insert into public.vinculo_perfil (usuario_id, perfil) values (v_admin, 'ADMINISTRADOR');
  for v_estagio in select g.id, g.curso_id, e.matricula, (select v.usuario_id from public.vinculo_perfil v where v.curso_id = g.curso_id and v.perfil = 'COORDENACAO' limit 1) as coordenador
                   from public.estagio g join public.estudante e on e.id = g.estudante_id join public.curso c on c.id = g.curso_id
                   where c.codigo like '${MARCA}-%' order by e.matricula loop
    insert into public.documento (tipo, chave_objeto, nome_original, tipo_mime, tamanho_bytes, sha256, sensivel, estagio_id, enviado_por_usuario_id)
      values ('ATESTADO_AFASTAMENTO', 'documentos/carga-atestado-' || v_estagio.id || '.pdf', 'atestado.pdf', 'application/pdf', 100, repeat('1', 64), true, v_estagio.id, v_estagio.coordenador)
      returning id into v_documento;
    insert into public.afastamento (estagio_id, tipo, data_inicio, data_fim, dias_extensao, data_fim_prevista_anterior, data_fim_prevista_nova, documento_id, registrado_por_usuario_id)
      values (v_estagio.id, 'LICENCA', '2026-03-07', '2026-03-08', 0, '2027-02-26', '2027-02-26', v_documento, v_estagio.coordenador);
    if split_part(v_estagio.matricula, '-', 3)::int % 10 = 5 then
      insert into public.rescisao (estagio_id, data_rescisao, solicitante, motivo, minutos_cumpridos_consolidados, minutos_homologados_consolidados, decidido_por_usuario_id)
        values (v_estagio.id, '2026-10-30', 'ESTUDANTE', 'Carga de desempenho', 0, 0, v_estagio.coordenador);
    end if;
  end loop;
end
$carga5$;
`;

// Fase 4: categories, activities with proof and approvals, through the triggers of M06 and M07
const CARGA_FASE4_SQL = `
do $carga4$
declare
  v_curso record; v_categorias uuid[]; v_categoria uuid; v_estudante record; v_atividade uuid; v_documento uuid; k int; i int;
begin
  for v_curso in select c.id, (select v.usuario_id from public.vinculo_perfil v where v.curso_id = c.id and v.perfil = 'COORDENACAO' limit 1) as coordenador
                 from public.curso c where c.codigo like '${MARCA}-%' order by c.codigo loop
    v_categorias := array[]::uuid[];
    for i in 1..4 loop
      insert into public.categoria_atividade (nome) values ('${MARCA} ' || v_curso.id || ' ' || i) returning id into v_categoria;
      v_categorias := v_categorias || v_categoria;
    end loop;
    insert into public.exigencia_categoria (curso_id, categoria_id, limite_minutos)
      select v_curso.id, unnest(v_categorias), 30 * 60;
    for v_estudante in select e.id, e.usuario_id from public.estudante e where e.curso_id = v_curso.id loop
      for k in 1..8 loop
        insert into public.documento (tipo, chave_objeto, nome_original, tipo_mime, tamanho_bytes, sha256, estudante_id, enviado_por_usuario_id)
          values ('COMPROVANTE_ATIVIDADE', 'documentos/carga-' || v_estudante.id || '-' || k || '.pdf', 'certificado.pdf', 'application/pdf', 100,
                  encode(sha256((v_estudante.id::text || k)::bytea), 'hex'), v_estudante.id, v_estudante.usuario_id)
          returning id into v_documento;
        insert into public.atividade_complementar (estudante_id, categoria_id, descricao, instituicao_promotora, data_inicio, data_fim,
                                                   horas_declaradas_minutos, registrada_por_usuario_id)
          values (v_estudante.id, v_categorias[1 + (k % 4)], 'Atividade de carga ' || k, 'UFAL', '2026-04-01', '2026-04-10', 10 * 60, v_estudante.usuario_id)
          returning id into v_atividade;
        insert into public.comprovante_atividade (atividade_id, estudante_id, documento_id, sha256)
          values (v_atividade, v_estudante.id, v_documento, repeat('0', 64));
        if k <= 5 then
          insert into public.analise_atividade (atividade_id, decisao, analisado_por_usuario_id) values (v_atividade, 'APROVADA', v_curso.coordenador);
        end if;
      end loop;
    end loop;
  end loop;
end
$carga4$;
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
    const { rows: comFase4 } = await owner.query(`select 1 from public.atividade_complementar a join public.estudante e on e.id = a.estudante_id where e.matricula = 'CARGA-1-1' limit 1`);
    if (comFase4.length === 0) {
      const inicio = performance.now();
      await owner.query("begin");
      await owner.query(CARGA_FASE4_SQL);
      await owner.query("commit");
      console.log(`carga da Fase 4 criada em ${((performance.now() - inicio) / 1000).toFixed(1)} s`);
    }
    const { rows: comFase5 } = await owner.query(`select 1 from public.usuario where email = 'admin-carga@carga.local'`);
    if (comFase5.length === 0) {
      const inicio = performance.now();
      await owner.query("begin");
      await owner.query(CARGA_FASE5_SQL);
      await owner.query("commit");
      console.log(`carga da Fase 5 criada em ${((performance.now() - inicio) / 1000).toFixed(1)} s`);
    }
    const { rows: volume } = await owner.query<{ tabela: string; linhas: string }>(`
      select 'estagio' as tabela, count(*)::text as linhas from public.estagio
      union all select 'registro_frequencia', count(*)::text from public.registro_frequencia
      union all select 'relatorio', count(*)::text from public.relatorio
      union all select 'responsavel_estagio', count(*)::text from public.responsavel_estagio
      union all select 'atividade_complementar', count(*)::text from public.atividade_complementar
      union all select 'apuracao_integralizacao', count(*)::text from public.apuracao_integralizacao
      union all select 'afastamento', count(*)::text from public.afastamento
      union all select 'rescisao', count(*)::text from public.rescisao
      union all select 'documento', count(*)::text from public.documento`);
    console.table(volume);

    const pessoa = async (email: string) => {
      const { rows } = await owner.query<{ id: string }>("select id from public.usuario where email = $1", [email]);
      return { userId: rows[0].id } as Identity;
    };
    const { rows: alvo } = await owner.query<{ id: string; aluno: string; estudante: string; orientador: string; supervisor: string }>(`
      select g.id, e.usuario_id as aluno, e.id as estudante,
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
    // Issue #80: lists that now read the student through app.identidades_estudante
    medicoes.push(await medir("GET /estagios?limit=20", "orientador (30 estágios)", async () => (await listEstagios(orientador, { page: 1, limit: 20 })).items));
    medicoes.push(await medir("GET /estagios?limit=20", "supervisor", async () => (await listEstagios(supervisor, { page: 1, limit: 20 })).items));
    medicoes.push(await medir("GET /estagios?busca=CARGA", "coordenação (300 estágios)", async () => (await listEstagios(coordenacao, { page: 1, limit: 20, busca: "CARGA" })).items));
    medicoes.push(await medir("GET /atividades-complementares", "estudante", () => listAtividades(aluno, {})));
    medicoes.push(await medir("GET /atividades-complementares", "coordenação (2.400 atividades)", () => listAtividades(coordenacao, {})));
    medicoes.push(await medir("GET /atividades-complementares/pendentes", "coordenação (900 em análise)", () => listFilaAnalise(coordenacao)));
    medicoes.push(await medir("Tela de atividades: fila, 1 página", "coordenação (900 em análise)", async () => (await listFilaAnalisePagina(coordenacao, { page: 1, limit: 20 })).items));
    medicoes.push(await medir("Tela de atividades: fila, última página", "coordenação (900 em análise)", async () => (await listFilaAnalisePagina(coordenacao, { page: 45, limit: 20 })).items));
    medicoes.push(await medir("Tela de atividades: minhas", "estudante", async () => (await listAtividadesPagina(aluno, { estudanteId: alvo[0].estudante }, { page: 1, limit: 20 })).items));
    for (const visao of VISOES_RELATORIO) {
      medicoes.push(await medir(`Tela de relatórios: ${visao}`, "coordenação (300 estágios)", async () => (await listRelatoriosPendentesPagina(coordenacao, { visao, page: 1, limit: 20 })).items));
    }
    medicoes.push(await medir("GET /integralizacao", "estudante", () => getMinhaIntegralizacao(aluno)));
    medicoes.push(await medir("GET /estudantes/{id}/integralizacao", "coordenação", () => getIntegralizacao(coordenacao, alvo[0].estudante)));
    const administrador = await pessoa("admin-carga@carga.local");
    const semFiltro = { cursoId: null, concedenteId: null, de: null, ate: null };
    medicoes.push(await medir("GET /estagios/{id}/afastamentos", "coordenação", () => listAfastamentos(coordenacao, estagioId)));
    medicoes.push(await medir("GET /estagios/{id}/tce/pdf", "estudante", async () => [await pdfTce(aluno, estagioId)]));
    for (const tipo of ["estagiarios-ativos", "concedentes-parceiras", "taxa-conclusao", "pendencias-integralizacao"] as const) {
      medicoes.push(await medir(`GET /relatorios-gerenciais/${tipo}`, "coordenação (300 estágios)", () => gerarRelatorio(coordenacao, tipo, semFiltro)));
      medicoes.push(await medir(`GET /relatorios-gerenciais/${tipo}`, "administrador (600 estágios)", () => gerarRelatorio(administrador, tipo, semFiltro)));
    }
    medicoes.push(
      await medir("GET /relatorios-gerenciais/pendencias-integralizacao/exportacao?formato=pdf", "administrador (600 estudantes)", async () => [
        await exportarRelatorio(administrador, "pendencias-integralizacao", semFiltro, "pdf"),
      ]),
    );
    medicoes.push(await medir("GET /guarda-documental?ate=2099-12-31", "administrador", () => listDocumentosEmGuarda(administrador, "2099-12-31")));
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
