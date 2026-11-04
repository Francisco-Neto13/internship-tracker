import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// RF002: from the sign-in screen to the warning that reaches the administrator, with no e-mail.

async function entrar(page: import("@playwright/test").Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("a person asks from the sign-in screen and the administrator is taken to the account", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.251" });
  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueceu a senha?" }).click();
  await expect(page).toHaveURL(/\/recuperar-senha$/);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: "Pedir senha provisória" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "e-mail válido" })).toBeVisible();

  await page.getByLabel("E-mail").fill("bruno.estudante@internship.local");
  await page.getByRole("button", { name: "Pedir senha provisória" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pedido registrado" })).toBeVisible();

  await page.context().clearCookies();
  await entrar(page, "admin@internship.local", 252);
  await page.goto("/notificacoes");
  await page.getByRole("listitem").filter({ hasText: "bruno.estudante@internship.local" }).first().getByRole("link", { name: /Abrir/ }).click();
  await expect(page).toHaveURL(/\/administracao\/usuarios\/[0-9a-f-]+$/);
  await expect(page.getByRole("main")).toContainText("bruno.estudante@internship.local");
  await expect(page.getByRole("button", { name: "Emitir senha provisória" })).toBeVisible();
});

test("any e-mail gets the same answer, and a burst of requests is limited", async ({ request }) => {
  // An address of its own: the limit lasts a minute, and a retry must not meet the previous run
  const endereco = `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
  const pedir = (email: string) =>
    request.post("/api/auth/recuperacao-senha", { headers: { "x-forwarded-for": endereco, origin: "http://localhost:3000" }, data: { email } });

  const existente = await pedir("ana.estudante@internship.local");
  const inexistente = await pedir("ninguem@internship.local");
  expect(existente.status()).toBe(200);
  expect(inexistente.status()).toBe(200);
  expect(await inexistente.json()).toEqual(await existente.json());

  await pedir("ninguem@internship.local");
  expect((await pedir("ninguem@internship.local")).status()).toBe(429);
});
