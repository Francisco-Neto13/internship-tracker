import { randomUUID } from "node:crypto";
import type { Browser } from "@playwright/test";
import { dados, SENHA, type sessoes } from "./api";

// An internship that started on 2026-08-03, formalized and activated by the people who do it
// in real life, for a student created on every run (a previous run never blocks the next).
// Shared by the Fase 3 and Fase 5 API specs, each with its own address range.

type Sessao = ReturnType<typeof sessoes>;

/** The internship with its TCE in edition, before responsible people, plan and signatures. */
export async function criarEstagioEmFormalizacao(browser: Browser, sessao: Sessao, prefixo: string) {
  const admin = await sessao(browser, "admin@internship.local", SENHA);
  const curso = (await dados<{ id: string; codigo: string }[]>(await admin.get("/api/v1/cursos"))).find((item) => item.codigo === "ENG-SOFT")!;
  const buscarId = async (email: string) => (await dados<{ id: string }[]>(await admin.get(`/api/v1/usuarios?busca=${email}`)))[0].id;
  const email = `${prefixo}-${randomUUID().slice(0, 8)}@internship.local`;
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
  return { id: estagio.id, estudanteId: estudante.id, concedenteId: concedente.id, email, senhaProvisoria: novo.senha_provisoria, admin, coordenacao, buscarId };
}

export async function criarEstagioAtivoDesdeAgosto(browser: Browser, sessao: Sessao, prefixo: string) {
  const { id, estudanteId, concedenteId, email, senhaProvisoria, admin, coordenacao, buscarId } = await criarEstagioEmFormalizacao(browser, sessao, prefixo);
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "ORIENTADOR", usuario_id: await buscarId("orientador@internship.local") } }), 201);
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "SUPERVISOR", usuario_id: await buscarId("supervisor@exemplo-software.local") } }), 201);

  const aluno = await sessao(browser, email, senhaProvisoria);
  await dados(await aluno.post("/api/v1/auth/senha", { data: { senha_atual: senhaProvisoria, nova_senha: `frase segura do ${prefixo} e2e` } }));
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
  return { id, estudanteId, concedenteId, aluno, orientador, supervisor, coordenacao, concedenteRh, admin };
}
