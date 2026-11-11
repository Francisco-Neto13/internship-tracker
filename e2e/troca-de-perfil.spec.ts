import { expect, test } from "@playwright/test";
import { dados, erro, SENHA, sessoes, telaDe } from "./support/api";
import { criarEstagioEmFormalizacao } from "./support/estagio";

// RF003: the administrator acts as another account, from the screen, and goes back. Meanwhile
// every screen is that account's, what is done is saved in its name with the administrator in
// the trail, and the banner says so. The password stays the administrator's own business.

const sessao = sessoes(200);

test("the administrator sees the system as a student and goes back", async ({ browser }) => {
  const admin = await sessao(browser, "admin@internship.local", SENHA);
  const tela = await telaDe(admin);
  await tela.goto("/dashboard");

  await tela.getByRole("button", { name: "Ver como", exact: true }).click();
  const dialogo = tela.getByRole("dialog", { name: "Ver o sistema como outra conta" });
  await dialogo.getByRole("button", { name: "Estudante", exact: true }).click();
  await dialogo.getByRole("textbox", { name: "Buscar conta por nome ou e-mail" }).fill("ana.estudante@");
  await dialogo.getByRole("button", { name: "Ver o sistema como Ana Estudante" }).click();

  const faixa = tela.getByTestId("faixa-contexto");
  await expect(faixa).toContainText("está usando o sistema como Ana Estudante");
  await expect(faixa).toContainText("Estudante");
  await expect(tela.getByTestId("usuario-autenticado")).toHaveText("Ana Estudante");
  await expect(tela.getByRole("button", { name: "Ver como", exact: true })).toHaveCount(0);
  await expect(tela.getByRole("link", { name: "Integralização" }).first()).toBeVisible();

  // The student's reach, not the administrator's
  await tela.goto("/administracao/usuarios");
  await expect(tela).toHaveURL(/\/sem-acesso/);

  // Same session through the API: it acts as the student, but the password is not the switch's
  const contexto = (await dados<{ contexto: { titular: { nome: string } } | null }>(await admin.get("/api/v1/auth/sessao"))).contexto;
  expect(contexto?.titular.nome).toBeTruthy();
  const recusa = await erro(await admin.post("/api/v1/auth/senha", { data: { senha_atual: SENHA, nova_senha: "uma frase que nunca vale aqui" } }), 403);
  expect(recusa.code).toBe("CONTEXTO_ACAO_DA_CONTA");

  await tela.goto("/dashboard");
  await faixa.getByRole("button", { name: "Voltar ao meu perfil" }).click();
  await expect(faixa).toHaveCount(0);
  await expect(tela.getByRole("button", { name: "Ver como", exact: true })).toBeVisible();
  expect((await dados<{ contexto: unknown }>(await admin.get("/api/v1/auth/sessao"))).contexto).toBeNull();
});

test("the administrator formalizes an internship as each party, without signing in again", async ({ browser }) => {
  const { id, email, admin, buscarId } = await criarEstagioEmFormalizacao(browser, sessao, "troca");
  const como = async (usuarioId: string) => dados(await admin.post("/api/v1/contexto", { data: { usuario_id: usuarioId } }), 201);
  const [coordenacao, orientador, supervisor, concedente, aluno] = await Promise.all(
    ["coordenacao.software@internship.local", "orientador@internship.local", "supervisor@exemplo-software.local", "rh@exemplo-software.local", email].map(buscarId),
  );

  await como(coordenacao);
  await dados(await admin.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "ORIENTADOR", usuario_id: orientador } }), 201);
  await dados(await admin.post(`/api/v1/estagios/${id}/responsaveis`, { data: { papel: "SUPERVISOR", usuario_id: supervisor } }), 201);
  await como(aluno);
  await dados(await admin.put(`/api/v1/estagios/${id}/plano-atividades`, { data: { atividades_previstas: "Sistemas web", justificativa_compatibilidade: "Engenharia de software" } }));
  await dados(await admin.post(`/api/v1/estagios/${id}/plano-atividades/envio`));
  await como(orientador);
  await dados(await admin.post(`/api/v1/estagios/${id}/plano-atividades/aprovacao`));
  await como(concedente);
  await dados(
    await admin.post(`/api/v1/estagios/${id}/apolices`, {
      data: { seguradora: "Seguradora E2E", numero_apolice: "AP-TROCA", contratante: "CONCEDENTE", vigencia_inicio: "2026-08-01", vigencia_fim: "2027-12-31" },
    }),
    201,
  );
  await como(coordenacao);
  await dados(await admin.post(`/api/v1/estagios/${id}/tce/fechamento`));
  await dados(await admin.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "INSTITUICAO" } }), 201);
  await como(aluno);
  await dados(await admin.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "ESTUDANTE" } }), 201);
  await como(concedente);
  await dados(await admin.post(`/api/v1/estagios/${id}/assinaturas`, { data: { parte: "CONCEDENTE" } }), 201);
  await como(coordenacao);
  expect((await dados<{ situacao: string }>(await admin.post(`/api/v1/estagios/${id}/ativacao`))).situacao).toBe("ATIVO");

  // Back as the administrator: each signature is the party's, done by the administrator
  await dados(await admin.delete("/api/v1/contexto"));
  type Linha = { usuario_id: string; titular: { nome: string } | null; dados_novos: { estagio_id?: string; parte?: string } | null };
  const trilha = await dados<Linha[]>(await admin.get("/api/v1/auditoria?tabela=assinatura&operacao=INSERT&limit=100"));
  const assinaturas = trilha.filter((linha) => linha.dados_novos?.estagio_id === id);
  expect(assinaturas.map((linha) => linha.dados_novos?.parte).sort()).toEqual(["CONCEDENTE", "ESTUDANTE", "INSTITUICAO"]);
  expect(assinaturas.find((linha) => linha.dados_novos?.parte === "ESTUDANTE")?.usuario_id).toBe(aluno);
  expect(assinaturas.every((linha) => linha.titular?.nome)).toBe(true);
});

test("only the administrator switches", async ({ browser }) => {
  const coordenacao = await sessao(browser, "coordenacao.software@internship.local", SENHA);
  const contas = await dados<{ id: string; email: string }[]>(await coordenacao.get("/api/v1/usuarios?limit=100"));
  const outra = contas.find((conta) => conta.email !== "coordenacao.software@internship.local");
  expect(outra).toBeDefined();
  expect((await erro(await coordenacao.post("/api/v1/contexto", { data: { usuario_id: outra!.id } }), 403)).code).toBe("CONTEXTO_RESTRITO_AO_ADMINISTRADOR");
  expect((await erro(await coordenacao.get("/api/v1/contexto/contas"), 403)).code).toBe("CONTEXTO_RESTRITO_AO_ADMINISTRADOR");

  const tela = await telaDe(coordenacao);
  await tela.goto("/dashboard");
  await expect(tela.getByTestId("usuario-autenticado")).toBeVisible();
  await expect(tela.getByRole("button", { name: "Ver como", exact: true })).toHaveCount(0);
});
