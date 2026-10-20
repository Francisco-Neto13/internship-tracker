import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Seeded by scripts/db/seed.ts
const SEED_PASSWORD = "senha-dev-internship";
const ADMIN = "admin@internship.local";

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("a user created by the administrator must replace the temporary password first (RF001, RF002)", async ({
  page,
  browser,
}) => {
  await entrar(page, ADMIN, SEED_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);

  const email = `e2e-${randomUUID().slice(0, 8)}@internship.local`;
  const criado = await page.request.post("/api/v1/usuarios", {
    data: { nome: "Pessoa E2E", email, perfis: [{ perfil: "PROFESSOR_ORIENTADOR" }] },
  });
  expect(criado.status()).toBe(201);
  expect(criado.headers()["cache-control"]).toBe("no-store");
  const { data } = (await criado.json()) as { data: { senha_provisoria: string } };

  const contexto = await browser.newContext();
  const novo = await contexto.newPage();
  await entrar(novo, email, data.senha_provisoria);

  await expect(novo).toHaveURL(/\/trocar-senha$/);
  const bloqueada = await novo.request.get("/api/v1/estudantes");
  expect(bloqueada.status()).toBe(403);
  expect(((await bloqueada.json()) as { error: { code: string } }).error.code).toBe("TROCA_SENHA_OBRIGATORIA");

  // any other screen sends the user back to the change form
  await novo.goto("/dashboard");
  await expect(novo).toHaveURL(/\/trocar-senha$/);

  const novaSenha = "minha frase de acesso e2e";
  await novo.getByLabel("Senha provisória", { exact: true }).fill(data.senha_provisoria);
  await novo.getByLabel("Nova senha", { exact: true }).fill(novaSenha);
  await novo.getByLabel("Confirme a nova senha").fill(novaSenha);
  await novo.getByRole("button", { name: "Salvar nova senha" }).click();

  await expect(novo).toHaveURL(/\/dashboard$/);
  expect((await novo.request.get("/api/v1/estudantes")).status()).toBe(200);
  await contexto.close();
});
