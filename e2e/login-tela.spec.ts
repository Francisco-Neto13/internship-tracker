import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The sign-in screen: the form comes first for whoever does not use a mouse, the route explains the
// profiles without touching the flow, and every scenario of the authentication answers as before.

const SENHA = "senha-dev-internship";
const endereco = () => `198.51.100.${1 + Math.floor(Math.random() * 254)}`;

async function preencher(page: Page, email: string, senha: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("screen", () => {
  test("has no automatic WCAG violation with a profile chosen, at any width", async ({ page }) => {
    await page.goto("/login");
    for (const width of [1440, 820, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole("button", { name: "Coordenação" }).click();
      const { violations } = await new AxeBuilder({ page }).exclude("[data-decorativo]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations.map((item) => item.id), String(width)).toEqual([]);
      await page.getByRole("button", { name: "Coordenação" }).click();
    }
  });

  test("the keyboard reaches the form before the route, and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 360);
    await expect(page.getByLabel("E-mail")).toBeInViewport();
    await page.getByLabel("E-mail").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Entrar" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Esqueceu a senha?" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Estudante" })).toBeFocused();
  });

  test("a profile shows the stages where it acts, and the keyboard does it too", async ({ page }) => {
    await page.goto("/login");
    const atuando = page.getByTestId("percurso").locator("[data-atua]");
    await expect(atuando).toHaveCount(0);

    const orientador = page.getByRole("button", { name: "Orientador" });
    await orientador.focus();
    await expect(atuando).toHaveCount(2);
    await expect(atuando.first()).toContainText("Plano de atividades");
    await expect(page.getByText("analisa os relatórios")).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(orientador).toHaveAttribute("aria-pressed", "true");
    await orientador.blur();
    await expect(atuando).toHaveCount(2);

    // The administrator takes part in no stage: reads no report nor medical certificate
    await page.getByRole("button", { name: "Administrador" }).click();
    await expect(atuando).toHaveCount(0);
    await expect(page.getByText("sem ler relatórios nem atestados")).toBeVisible();
  });
});

test.describe("authentication scenarios", () => {
  test("an inactive account hears so only after the right password", async ({ browser }) => {
    const contexto = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": endereco() } });
    const admin = await contexto.newPage();
    await admin.goto("/login");
    await preencher(admin, "admin@internship.local", SENHA);
    await expect(admin).toHaveURL(/\/dashboard$/);
    const email = `inativa-${randomUUID().slice(0, 8)}@internship.local`;
    const criado = await admin.request.post("/api/v1/usuarios", { data: { nome: "Pessoa Inativa", email, perfis: [{ perfil: "PROFESSOR_ORIENTADOR" }] } });
    const { data } = await criado.json();
    expect((await admin.request.post(`/api/v1/usuarios/${data.id}/inativacao`)).ok()).toBe(true);
    await contexto.close();

    const outro = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": endereco() } });
    const page = await outro.newPage();
    await page.goto("/login");
    await preencher(page, email, "senha-errada-do-teste-1");
    await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();
    await preencher(page, email, data.senha_provisoria);
    await expect(page.getByRole("alert").filter({ hasText: "Usuário inativo." })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await outro.close();
  });

  test("too many attempts ask to wait", async ({ browser }) => {
    const contexto = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": endereco() } });
    const page = await contexto.newPage();
    await page.goto("/login");
    for (let tentativa = 0; tentativa < 4; tentativa += 1) await preencher(page, "ninguem@internship.local", `senha-errada-${tentativa}-do-teste`);
    await expect(page.getByRole("alert").filter({ hasText: "Muitas tentativas seguidas" })).toBeVisible();
    await contexto.close();
  });
});

test("the form fits a small notebook without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "Esqueceu a senha?" })).toBeInViewport({ ratio: 1 });
});
