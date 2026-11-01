import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { dados, SENHA, sessoes } from "./support/api";

// Fase 2 end to end through the HTTP API: each person acts with their own session, as in real
// life (administrator, coordination, student, advisor, concedente), until the internship is ATIVO.
// A new student is created on every run, so a previous run never blocks this one.

const sessao = sessoes(50);

test("an internship goes from EM_FORMALIZACAO to ATIVO through the API (Fase 2)", async ({ browser }) => {
  const admin = await sessao(browser, "admin@internship.local", SENHA);
  const cursos = await dados<{ id: string; codigo: string }[]>(await admin.get("/api/v1/cursos"));
  const curso = cursos.find((item) => item.codigo === "ENG-SOFT")!;
  const buscarId = async (email: string) => (await dados<{ id: string }[]>(await admin.get(`/api/v1/usuarios?busca=${email}`)))[0].id;
  const orientadorId = await buscarId("orientador@internship.local");
  const supervisorId = await buscarId("supervisor@exemplo-software.local");

  const email = `estagiario-${randomUUID().slice(0, 8)}@internship.local`;
  const novo = await dados<{ id: string; senha_provisoria: string }>(
    await admin.post("/api/v1/usuarios", { data: { nome: "Estagiário E2E", email, perfis: [{ perfil: "ESTUDANTE" }] } }),
    201,
  );
  const estudante = await dados<{ id: string }>(
    await admin.post("/api/v1/estudantes", {
      data: { usuario_id: novo.id, curso_id: curso.id, matricula: `E2E${randomUUID().slice(0, 8)}`, periodo: 5 },
    }),
    201,
  );

  const coordenacao = await sessao(browser, "coordenacao.software@internship.local", SENHA);
  const [concedente] = await dados<{ id: string }[]>(await coordenacao.get("/api/v1/concedentes?busca=11222333000181"));
  const convenios = await dados<{ id: string; numero: string; vigente_hoje: boolean }[]>(
    await coordenacao.get(`/api/v1/concedentes/${concedente.id}/convenios`),
  );
  const convenio = convenios.find((item) => item.numero === "CV-2026-0001")!;

  const estagio = await dados<{ id: string; situacao: string }>(
    await coordenacao.post("/api/v1/estagios", {
      data: {
        estudante_id: estudante.id,
        concedente_id: concedente.id,
        convenio_id: convenio.id,
        tipo: "OBRIGATORIO",
        data_inicio: "2026-11-02",
        data_fim_pactuada: "2027-11-01",
        carga_horas_diaria: 6,
        carga_horas_semanal: 30,
        carga_horas_total: 400,
        condicoes_pactuadas: "Desenvolvimento de software sob supervisão",
      },
    }),
    201,
  );
  expect(estagio.situacao).toBe("EM_FORMALIZACAO");

  // Too early: every impediment reported at once
  const cedo = await coordenacao.post(`/api/v1/estagios/${estagio.id}/ativacao`);
  expect(cedo.status()).toBe(409);
  const { error } = (await cedo.json()) as { error: { code: string; details: { code: string }[] } };
  expect(error.code).toBe("ATIVACAO_BLOQUEADA");
  expect(error.details.map((detalhe) => detalhe.code)).toEqual(
    expect.arrayContaining(["PLANO_NAO_APROVADO", "RESPONSAVEIS_INCOMPLETOS", "APOLICE_AUSENTE", "TCE_NAO_FECHADO"]),
  );

  await dados(await coordenacao.post(`/api/v1/estagios/${estagio.id}/responsaveis`, { data: { papel: "ORIENTADOR", usuario_id: orientadorId } }), 201);
  await dados(await coordenacao.post(`/api/v1/estagios/${estagio.id}/responsaveis`, { data: { papel: "SUPERVISOR", usuario_id: supervisorId } }), 201);

  const aluno = await sessao(browser, email, novo.senha_provisoria);
  await dados(await aluno.post("/api/v1/auth/senha", { data: { senha_atual: novo.senha_provisoria, nova_senha: "frase segura do estagio e2e" } }));
  await dados(
    await aluno.put(`/api/v1/estagios/${estagio.id}/plano-atividades`, {
      data: { atividades_previstas: "Manutenção de sistemas web", justificativa_compatibilidade: "Engenharia de software aplicada" },
    }),
  );
  await dados(await aluno.post(`/api/v1/estagios/${estagio.id}/plano-atividades/envio`));

  const orientador = await sessao(browser, "orientador@internship.local", SENHA);
  const plano = await dados<{ situacao: string }>(await orientador.post(`/api/v1/estagios/${estagio.id}/plano-atividades/aprovacao`));
  expect(plano.situacao).toBe("APROVADO");

  const concedenteRh = await sessao(browser, "rh@exemplo-software.local", SENHA);
  await dados(
    await concedenteRh.post(`/api/v1/estagios/${estagio.id}/apolices`, {
      data: { seguradora: "Seguradora E2E", numero_apolice: "AP-E2E", contratante: "CONCEDENTE", vigencia_inicio: "2026-11-01", vigencia_fim: "2027-12-31" },
    }),
    201,
  );

  const fechado = await dados<{ hash_tce: string }>(await coordenacao.post(`/api/v1/estagios/${estagio.id}/tce/fechamento`));
  expect(fechado.hash_tce).toMatch(/^[0-9a-f]{64}$/);
  await dados(await coordenacao.post(`/api/v1/estagios/${estagio.id}/assinaturas`, { data: { parte: "INSTITUICAO" } }), 201);
  await dados(await aluno.post(`/api/v1/estagios/${estagio.id}/assinaturas`, { data: { parte: "ESTUDANTE" } }), 201);
  await dados(await concedenteRh.post(`/api/v1/estagios/${estagio.id}/assinaturas`, { data: { parte: "CONCEDENTE" } }), 201);

  const ativo = await dados<{ situacao: string; ativado_em: string }>(await coordenacao.post(`/api/v1/estagios/${estagio.id}/ativacao`));
  expect(ativo.situacao).toBe("ATIVO");

  // The student sees it; the concedente sees it; the formalization steps are complete
  const visto = await dados<{ etapas_formalizacao: { partes_pendentes: string[] } }>(await aluno.get(`/api/v1/estagios/${estagio.id}`));
  expect(visto.etapas_formalizacao.partes_pendentes).toEqual([]);
  expect((await concedenteRh.get(`/api/v1/estagios/${estagio.id}`)).status()).toBe(200);
});
