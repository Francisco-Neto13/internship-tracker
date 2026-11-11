import { expect, test } from "@playwright/test";
import { dados, erro, SENHA, sessoes, telaDe } from "./support/api";

// RF003: the administrator sees the system as another account, from the screen, and goes back.
// Meanwhile every screen is the viewed account's, nothing is saved, and the banner says so.

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
  await expect(faixa).toContainText("está vendo o sistema como Ana Estudante");
  await expect(faixa).toContainText("Estudante");
  await expect(tela.getByTestId("usuario-autenticado")).toHaveText("Ana Estudante");
  await expect(tela.getByRole("button", { name: "Ver como", exact: true })).toHaveCount(0);
  await expect(tela.getByRole("link", { name: "Integralização" }).first()).toBeVisible();

  // The student's reach, not the administrator's
  await tela.goto("/administracao/usuarios");
  await expect(tela).toHaveURL(/\/sem-acesso/);

  // Same session through the API: the viewed account reads, and nothing is written
  const contexto = (await dados<{ contexto: { titular: { nome: string } } | null }>(await admin.get("/api/v1/auth/sessao"))).contexto;
  expect(contexto?.titular.nome).toBeTruthy();
  const recusa = await erro(await admin.post("/api/v1/auth/senha", { data: { senha_atual: SENHA, nova_senha: "uma frase que nunca vale aqui" } }), 403);
  expect(recusa.code).toBe("CONTEXTO_SOMENTE_LEITURA");

  await tela.goto("/dashboard");
  await faixa.getByRole("button", { name: "Voltar ao meu perfil" }).click();
  await expect(faixa).toHaveCount(0);
  await expect(tela.getByRole("button", { name: "Ver como", exact: true })).toBeVisible();
  expect((await dados<{ contexto: unknown }>(await admin.get("/api/v1/auth/sessao"))).contexto).toBeNull();
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
