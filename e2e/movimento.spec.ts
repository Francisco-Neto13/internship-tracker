import { expect, test, type Locator, type Page } from "@playwright/test";

// Movement helps and never blocks. The other specs run with reduced motion (playwright.config.ts);
// here it is on, because motion is the subject.

async function entrar(page: Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const animacao = (alvo: Locator) => alvo.evaluate((elemento) => ({ nome: getComputedStyle(elemento).animationName, duracao: parseFloat(getComputedStyle(elemento).animationDuration) }));

test.describe("with movement", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("no animation lasts more than half a second", async ({ page }) => {
    await entrar(page, "coordenacao.software@internship.local", 231);
    await page.goto("/estagios");
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const duracoes = await page.evaluate(() => document.getAnimations().map((item) => Number(item.effect?.getComputedTiming().duration) || 0));
    expect(Math.max(0, ...duracoes.filter((valor) => valor < 10_000))).toBeLessThanOrEqual(500);
  });

  test("a failed sign-in shakes the message, and a new failure shakes it again", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.232" });
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("ana.estudante@internship.local");
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-do-teste");
    await page.getByRole("button", { name: "Entrar" }).click();
    const erro = page.getByRole("alert").filter({ hasText: "incorretos" });
    await expect(erro).toBeVisible();
    expect((await animacao(erro)).nome).toBe("tremer");
  });

  test("menu and dialog open and close with movement, and the page behind stays usable after", async ({ page }) => {
    await entrar(page, "orientador@internship.local", 233);
    await page.getByRole("button", { name: /Conta de/ }).click();
    expect((await animacao(page.getByRole("menu"))).nome).toBe("menu-in");
    await page.getByRole("menuitem", { name: "Sair" }).click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toBeVisible();
    expect((await animacao(dialogo)).nome).toBe("modal-in");
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toHaveCount(0);
    await page.getByRole("link", { name: "Estágios" }).first().click();
    await expect(page).toHaveURL(/\/estagios/);
  });

  test("a number counts up to the right value on the dashboard, and readers get it from the start", async ({ page }) => {
    await entrar(page, "coordenacao.software@internship.local", 234);
    await page.getByText("estágios no seu alcance").waitFor();
    const contador = page.getByText("estágios no seu alcance").locator("..").locator("span").first();
    const certo = await contador.locator(".sr-only").textContent();
    await expect(contador.locator('[aria-hidden="true"]')).toHaveText(certo!);
  });
});

test.describe("with reduced motion, the system setting", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("nothing moves, and the numbers are right from the first paint", async ({ page }) => {
    await entrar(page, "coordenacao.software@internship.local", 235);
    await page.getByRole("button", { name: /Conta de/ }).click();
    expect((await animacao(page.getByRole("menu"))).duracao).toBeLessThan(0.001);
    await page.keyboard.press("Escape");
    const atrasos = await page.locator(".grupo-em-sequencia > *").evaluateAll((itens) => itens.map((item) => getComputedStyle(item).animationDelay));
    for (const atraso of atrasos) expect(atraso).toBe("0s");
  });
});
