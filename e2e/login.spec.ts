import { expect, test } from "@playwright/test";

// Seeded by scripts/db/seed.ts
const SEED_PASSWORD = "senha-dev-internship";
const COORDENACAO = { email: "coordenacao.software@internship.local", nome: "Coordenacao de Software" };

test("redirects an anonymous visitor to the login page (RF002)", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
});

test("rejects a wrong password without revealing whether the account exists", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(COORDENACAO.email);
  await page.getByLabel("Senha").fill("senha-incorreta-123");
  await page.getByRole("button", { name: "Entrar" }).click();

  // Next.js renders its own empty role="alert" route announcer, hence the text filter
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("signs in, shows the profiles in force and signs out (RF002, RF003)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(COORDENACAO.email);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("usuario-autenticado")).toHaveText(COORDENACAO.nome);
  await expect(page.getByTestId("perfis-vigentes")).toContainText("Coordenacao");

  const estudantes = await page.request.get("/api/v1/estudantes");
  expect(estudantes.status()).toBe(200);
  const body = (await estudantes.json()) as { data: { matricula: string }[] };
  // Coordination of Engenharia de Software sees Ana, never Bruno from Administracao
  expect(body.data.map((item) => item.matricula)).toContain("2026000001");
  expect(body.data.map((item) => item.matricula)).not.toContain("2026000002");

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  const depois = await page.request.get("/api/v1/estudantes");
  expect(depois.status()).toBe(401);
});
