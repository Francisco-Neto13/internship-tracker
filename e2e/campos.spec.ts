import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Issue #97: fields help before sending, and a field that takes text always declares its limit.

async function entrar(page: Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("the concedente form formats CNPJ, CEP and phone and offers the states", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 221);
  await page.goto("/administracao/concedentes");
  await page.getByRole("button", { name: /concedente/i }).first().click();

  const cnpj = page.getByLabel("CNPJ");
  await cnpj.pressSequentially("12abc34501de35xyz99");
  await expect(cnpj).toHaveValue("12.ABC.345/01DE-35");

  const cep = page.getByLabel("CEP");
  await cep.pressSequentially("abc57050000999");
  await expect(cep).toHaveValue("57050-000");

  const telefone = page.getByLabel("Telefone");
  await telefone.pressSequentially("ligar82999998888");
  await expect(telefone).toHaveValue("(82) 99999-8888");

  await expect(page.getByLabel("UF").locator("option")).toHaveCount(28);
  await page.getByLabel("UF").selectOption("AL");
});

test("a field cannot grow past the limit, and long text shows how much is left", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 222);
  await page.goto("/administracao/concedentes");
  await page.getByRole("button", { name: /concedente/i }).first().click();
  const razao = page.getByLabel("Razão social");
  await razao.fill("x".repeat(400)).catch(() => undefined);
  await razao.pressSequentially("y");
  expect((await razao.inputValue()).length).toBeLessThanOrEqual(200);

  await page.keyboard.press("Escape");
  await page.goto("/estagios/novo");
  const condicoes = page.getByLabel(/Condições pactuadas/);
  await condicoes.fill("abcde");
  await expect(page.getByText("5 de 5.000 caracteres")).toBeVisible();
});

test("every text field on the main screens declares a limit", async ({ page }) => {
  await entrar(page, "admin@internship.local", 223);
  for (const tela of ["/administracao/usuarios", "/administracao/auditoria", "/administracao/cursos", "/administracao/concedentes", "/administracao/estudantes"]) {
    await page.goto(tela);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const semLimite = await page
      .locator('main input:not([type=checkbox],[type=radio],[type=file],[type=hidden],[type=date],[type=number],[type=password],[maxlength]), main textarea:not([maxlength])')
      .count();
    expect(semLimite, tela).toBe(0);
  }
});

test("the password screen states its limits and refuses more than the ceiling before sending", async ({ page, request }) => {
  await entrar(page, "orientador@internship.local", 224);
  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: /senha/i }).click();
  await expect(page.getByText(/De 15 a 128 caracteres/)).toBeVisible();
  let enviou = false;
  page.on("request", (pedido) => {
    if (pedido.url().includes("/api/v1/auth/senha")) enviou = true;
  });
  // Pasted text is kept whole: nothing is cut without the person knowing
  const longa = `frase longa ${randomUUID()} `.repeat(6);
  await page.getByLabel("Senha atual", { exact: true }).fill("senha-dev-internship");
  await page.getByLabel("Nova senha", { exact: true }).fill(longa);
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveValue(longa);
  await page.getByLabel("Confirme a nova senha").fill(longa);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no máximo 128" })).toBeVisible();
  expect(enviou).toBe(false);

  // Sign-in refuses it through the API too, with the answer of a wrong password
  const resposta = await request.post("/api/auth/sign-in/email", {
    headers: { "x-forwarded-for": "203.0.113.225", origin: "http://localhost:3000" },
    data: { email: "orientador@internship.local", password: "x".repeat(129) },
  });
  expect(resposta.status()).toBe(401);
});

test("a field says what is wrong when the person leaves it, before saving", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 226);
  await page.goto("/administracao/concedentes");
  await page.getByRole("button", { name: /concedente/i }).first().click();
  let enviou = false;
  page.on("request", (pedido) => {
    if (pedido.method() === "POST" && pedido.url().endsWith("/api/v1/concedentes")) enviou = true;
  });

  const cnpj = page.getByLabel("CNPJ");
  await cnpj.pressSequentially("AAAAAAAAAAAA");
  // Nothing while the person is still typing
  await expect(page.getByText("CNPJ inválido")).toHaveCount(0);
  await cnpj.blur();
  await expect(page.getByText("CNPJ inválido")).toBeVisible();
  await expect(cnpj).toHaveAttribute("aria-invalid", "true");

  // It goes away as soon as it is fixed
  await cnpj.fill("");
  await cnpj.pressSequentially("11222333000181");
  await expect(page.getByText("CNPJ inválido")).toHaveCount(0);
  await expect(cnpj).toHaveAttribute("aria-invalid", "false");

  // Saving checks everything, sends nothing and goes to the first problem
  await page.getByRole("button", { name: "Cadastrar concedente" }).click();
  await expect(page.getByLabel("Razão social")).toBeFocused();
  await expect(page.getByText("Preencha este campo").first()).toBeVisible();
  expect(enviou).toBe(false);
});
