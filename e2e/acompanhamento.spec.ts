import { randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";
import { dados, erro, SENHA, sessoes } from "./support/api";

// Fase 3 end to end through the HTTP API: an internship that started on 2026-08-03 is
// formalized and activated, then each person does their part of the follow-up: the student
// records hours and sends a report, the supervisor homologates and evaluates, the advisor
// analyzes and records a visit, and the conclusion lists what is still missing. A new student
// is created on every run, so a previous run never blocks this one.

const sessao = sessoes(90);

async function estagioAtivoDesdeAgosto(browser: Browser) {
  const admin = await sessao(browser, "admin@internship.local", SENHA);
  const curso = (await dados<{ id: string; codigo: string }[]>(await admin.get("/api/v1/cursos"))).find((item) => item.codigo === "ENG-SOFT")!;
  const buscarId = async (email: string) => (await dados<{ id: string }[]>(await admin.get(`/api/v1/usuarios?busca=${email}`)))[0].id;
  const email = `acompanhamento-${randomUUID().slice(0, 8)}@internship.local`;
  const novo = await dados<{ id: string; senha_provisoria: string }>(
    await admin.post("/api/v1/usuarios", { data: { nome: "Estagiária E2E", email, perfis: [{ perfil: "ESTUDANTE" }] } }),
    201,
  );
  const estudante = await dados<{ id: string }>(
    await admin.post("/api/v1/estudantes", { data: { usuario_id: novo.id, curso_id: curso.id, matricula: `E2E${randomUUID().slice(0, 8)}`, periodo: 5 } }),
    201,
  );

  const coordenacao = await sessao(browser, "coordenacao.software@internship.local", SENHA);
  const [concedente] = await dados<{ id: string }[]>(await coordenacao.get("/api/v1/concedentes?busca=11222333000181"));
  const convenio = (await dados<{ id: string; numero: string }[]>(await coordenacao.get(`/api/v1/concedentes/${concedente.id}/convenios`))).find(
    (item) => item.numero === "CV-2026-0001",
  )!;
  const estagio = await dados<{ id: string }>(
    await coordenacao.post("/api/v1/estagios", {
      data: {
        estudante_id: estudante.id,
        concedente_id: concedente.id,
        convenio_id: convenio.id,
        tipo: "OBRIGATORIO",
        data_inicio: "2026-08-03",
        data_fim_pactuada: "2027-07-30",
        carga_horas_diaria: 6,
        carga_horas_semanal: 30,
        carga_horas_total: 400,
        condicoes_pactuadas: "Desenvolvimento de software sob supervisão",
      },
    }),
    201,
  );
  const id = estagio.id;
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "ORIENTADOR", usuario_id: await buscarId("orientador@internship.local") } }), 201);
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "SUPERVISOR", usuario_id: await buscarId("supervisor@exemplo-software.local") } }), 201);

  const aluno = await sessao(browser, email, novo.senha_provisoria);
  await dados(await aluno.post("/api/v1/auth/senha", { data: { senha_atual: novo.senha_provisoria, nova_senha: "frase segura do acompanhamento e2e" } }));
  await dados(await aluno.put(`/api/v1/estagios/${id}/plano-atividades`, { data: { atividades_previstas: "Sistemas web", justificativa_compatibilidade: "Engenharia de software" } }));
  await dados(await aluno.post(`/api/v1/estagios/${id}/plano-atividades/envio`));
  const orientador = await sessao(browser, "orientador@internship.local", SENHA);
  await dados(await orientador.post(`/api/v1/estagios/${id}/plano-atividades/aprovacao`));
  const concedenteRh = await sessao(browser, "rh@exemplo-software.local", SENHA);
  await dados(
    await concedenteRh.post(`/api/v1/estagios/${id}/apolices`, {
      data: { seguradora: "Seguradora E2E", numero_apolice: "AP-E2E-3", contratante: "CONCEDENTE", vigencia_inicio: "2026-08-01", vigencia_fim: "2027-12-31" },
    }),
    201,
  );
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/tce/fechamento`));
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "INSTITUICAO" } }), 201);
  await dados(await aluno.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "ESTUDANTE" } }), 201);
  await dados(await concedenteRh.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "CONCEDENTE" } }), 201);
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/ativacao`));

  const supervisor = await sessao(browser, "supervisor@exemplo-software.local", SENHA);
  return { id, aluno, orientador, supervisor, coordenacao, concedenteRh };
}

test("an active internship is followed through the API (Fase 3)", async ({ browser }) => {
  const { id, aluno, orientador, supervisor, coordenacao } = await estagioAtivoDesdeAgosto(browser);
  const api = (caminho: string) => `/api/v1/estagios/${id}${caminho}`;

  // RF023 to RF025: entry and exit, the legal daily limit refused with its code
  const dia = await dados<{ id: string; horas: number; situacao: string }>(
    await aluno.post(api("/frequencias"), { data: { data: "2026-08-03", hora_entrada: "08:00", hora_saida: "15:00", intervalo_horas: 1 } }),
    201,
  );
  expect(dia).toMatchObject({ horas: 6, situacao: "REGISTRADO" });
  expect((await erro(await aluno.post(api("/frequencias"), { data: { data: "2026-08-04", horas: 6.5 } }), 422)).code).toBe("LIMITE_JORNADA_EXCEDIDO");
  await dados(await aluno.post(api("/frequencias"), { data: { data: "2026-08-04", horas: 5 } }), 201);
  expect((await erro(await supervisor.post(api("/frequencias"), { data: { data: "2026-08-05", horas: 5 } }), 403)).code).toBe("LANCAMENTO_RESTRITO_AO_ESTUDANTE");

  // RF027, RF029: the supervisor homologates; the student can no longer correct that day
  const homologacao = await dados<{ horas_homologadas: number; lancamentos_homologados: number }>(
    await supervisor.post(api("/frequencias/homologacao"), { data: { periodo_inicio: "2026-08-03", periodo_fim: "2026-08-03", observacao: "Conferido" } }),
    201,
  );
  expect(homologacao).toMatchObject({ horas_homologadas: 6, lancamentos_homologados: 1 });
  expect((await erro(await aluno.patch(`/api/v1/frequencias/${dia.id}`, { data: { horas: 4, justificativa: "x" } }), 409)).code).toBe("LANCAMENTO_HOMOLOGADO");

  // RF026, RF028: only homologated hours count; two days since August diverge from 30 h a week
  const carga = await dados<{ horas_cumpridas: number; horas_homologadas: number; divergencia: { divergente: boolean; aberta_id: string | null } }>(
    await orientador.get(api("/carga-horaria")),
  );
  expect(carga).toMatchObject({ horas_cumpridas: 11, horas_homologadas: 6, divergencia: { divergente: true } });
  expect(carga.divergencia.aberta_id).not.toBeNull();
  const divergentes = await dados<{ estagio: { id: string } }[]>(await orientador.get("/api/v1/estagios/divergencias"));
  expect(divergentes.map((item) => item.estagio.id)).toContain(id);
  await dados(await orientador.post(`/api/v1/divergencias/${carga.divergencia.aberta_id}/analise`, { data: { parecer: "Início com carga reduzida" } }));

  // RF037, RF038: the student sends the first report, the advisor returns it; the supervisor does not read reports
  const relatorios = await dados<{ id: string; tipo: string; sequencia: number; situacao: string }[]>(await aluno.get(api("/relatorios")));
  expect(relatorios.map((item) => item.tipo)).toEqual(["PERIODICO", "PERIODICO", "FINAL"]);
  const enviado = await dados<{ situacao: string; versoes: unknown[] }>(
    await aluno.post(`/api/v1/relatorios/${relatorios[0].id}/versoes`, { data: { conteudo: "Atividades de agosto" } }),
    201,
  );
  expect(enviado).toMatchObject({ situacao: "EM_ANALISE" });
  expect((await erro(await orientador.post(`/api/v1/relatorios/${relatorios[0].id}/devolucao`, { data: {} }), 400)).code).toBe("PAYLOAD_INVALIDO");
  await dados(await orientador.post(`/api/v1/relatorios/${relatorios[0].id}/devolucao`, { data: { parecer: "Detalhe as entregas" } }), 201);
  expect((await erro(await supervisor.get(api("/relatorios")), 403)).code).toBe("ACESSO_NEGADO");

  // RF042, RF043: the supervisor answers every active criterion of the form
  const criterios = await dados<{ id: string; escala_maxima: number }[]>(await supervisor.get(api("/avaliacao/formulario")));
  expect(criterios.length).toBeGreaterThan(0);
  const avaliacao = await dados<{ momento: string; avaliador_perfil: string }>(
    await supervisor.post(api("/avaliacoes"), {
      data: { momento: "FINAL", respostas: criterios.map((criterio) => ({ criterio_id: criterio.id, nota: criterio.escala_maxima })) },
    }),
    201,
  );
  expect(avaliacao).toMatchObject({ momento: "FINAL", avaliador_perfil: "SUPERVISOR" });

  // RF033: the advisor records a visit; the student does not read the follow-up
  await dados(
    await orientador.post(api("/acompanhamentos"), {
      data: { tipo: "VISITA", data_ocorrencia: "2026-08-04", participantes: "Orientadora e supervisor", observacoes: "Atividades conforme o plano" },
    }),
    201,
  );
  expect((await erro(await aluno.get(api("/acompanhamentos")), 403)).code).toBe("ACESSO_NEGADO");

  // DER §5.2: what still keeps it from being concluded, all at once
  const pendencias = await dados<{ pode_concluir: boolean; impedimentos: { code: string }[] }>(await coordenacao.get(api("/pendencias-conclusao")));
  expect(pendencias.pode_concluir).toBe(false);
  expect(pendencias.impedimentos.map((item) => item.code).sort()).toEqual(["CARGA_MINIMA_NAO_CUMPRIDA", "FREQUENCIA_NAO_HOMOLOGADA", "RELATORIO_FINAL_PENDENTE"]);
});

