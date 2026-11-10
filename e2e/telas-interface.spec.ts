import { expect, test } from "@playwright/test";

// The rebuilt interface as people use it: the list state lives in the URL (search, filters,
// sort, page), opening a record and coming back keeps it, the sidebar shows only what the
// profile reaches, a consequence is confirmed before it happens, and no page scrolls sideways
// on a phone (RNF-09). Signs in from an address of its own; it uploads nothing.

// Login limit is 3 in 10 s per address, so each test signs in from its own
async function entrar(page: import("@playwright/test").Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("search, sort and page travel in the URL and survive opening a record", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 210);

  await page.goto("/administracao/estudantes");
  await page.getByPlaceholder("Buscar por nome ou matrícula").fill("Ana Estudante");
  await expect(page).toHaveURL(/busca=Ana/);
  await expect(page.getByTestId("estudantes-lista").getByRole("row")).toHaveCount(1);

  await page.getByRole("link", { name: "Matrícula" }).click();
  await expect(page).toHaveURL(/ordem=matricula/);
  await page.getByTestId("estudantes-lista").getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: "Ana Estudante", level: 1 })).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Estudantes", exact: true }).click();
  await expect(page).toHaveURL(/busca=Ana/);
  await expect(page).toHaveURL(/ordem=matricula/);

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page).not.toHaveURL(/busca=/);
  await expect(page.getByRole("navigation", { name: "Paginação" })).toContainText("de");
});

test("the dashboard and the sidebar follow the profile", async ({ page }) => {
  await entrar(page, "ana.estudante@internship.local", 211);
  await expect(page.getByRole("heading", { name: "Meu estágio", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Integralização" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Usuários e acesso" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Estudantes", exact: true })).toHaveCount(0);
});

test("an irreversible action explains itself and can be cancelled", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 212);
  await page.goto("/administracao/concedentes?busca=Empresa%20Exemplo%20de%20Software");
  await page.getByTestId("concedentes-lista").getByRole("link").first().click();
  await page.getByRole("button", { name: "Suspender" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("estágios em andamento continuam válidos");
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Suspender" })).toBeFocused();
});

test("a form with a lasting effect says so before sending, and cancelling sends nothing", async ({ page }) => {
  await entrar(page, "admin@internship.local", 214);
  await page.goto("/administracao/cursos");
  await page.getByRole("main").getByRole("link", { name: /Engenharia de Software/ }).first().click();
  let enviou = false;
  page.on("request", (pedido) => {
    if (pedido.method() === "PATCH" && pedido.url().includes("/api/v1/cursos/")) enviou = true;
  });
  await page.getByRole("button", { name: "Salvar curso" }).click();
  const confirmacao = page.getByRole("alertdialog");
  await expect(confirmacao).toContainText("recalcula a integralização");
  // Enter on an open dialog must not perform the action
  await expect(confirmacao.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await confirmacao.getByRole("button", { name: "Cancelar" }).click();
  await expect(confirmacao).toHaveCount(0);
  expect(enviou).toBe(false);
});

test("no page scrolls sideways on a phone (RNF-09)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await entrar(page, "coordenacao.software@internship.local", 213);
  await page.goto("/estagios?busca=Ana%20Estudante");
  await page.getByTestId("estagios-lista").getByRole("link").first().click();
  await expect(page.getByTestId("carga-horaria")).toBeVisible();
  const caminhoDoEstagio = new URL(page.url()).pathname;
  for (const rota of ["/dashboard", "/estagios", caminhoDoEstagio, "/frequencia", "/relatorios", "/atividades-complementares", "/administracao", "/administracao/estudantes", "/administracao/cursos", "/administracao/concedentes", "/administracao/relatorios-gerenciais", "/notificacoes"]) {
    await page.goto(rota);
    await expect(page.locator("h1").first()).toBeVisible();
    const excesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(excesso, rota).toBeLessThanOrEqual(0);
  }
});
