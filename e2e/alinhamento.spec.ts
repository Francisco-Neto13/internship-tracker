import { expect, test, type Page } from "@playwright/test";

// Screens with columns end on one line: a column shorter than the other does not leave a hole under
// its last panel. Measured at the width where the columns appear.

async function entrar(page: Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Each row of columns on the screen whose panels do not end together. */
const desalinhados = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("main .colunas-alinhadas"))
      .map((grade) => {
        const colunas = Array.from(grade.children).map((coluna) => {
          const ultimo = coluna.classList.contains("flex-col") ? (coluna.lastElementChild ?? coluna) : coluna;
          const caixa = ultimo.getBoundingClientRect();
          return { topo: Math.round(coluna.getBoundingClientRect().top), fim: Math.round(caixa.bottom), altura: caixa.height };
        });
        // Only what shares a line on the screen is compared
        const lado = colunas.filter((coluna) => coluna.topo === colunas[0].topo && coluna.altura > 0);
        return lado.length > 1 && Math.max(...lado.map((c) => c.fim)) - Math.min(...lado.map((c) => c.fim)) > 1 ? lado.map((c) => c.fim) : null;
      })
      .filter(Boolean),
  );

test("columns end on the same line for the administrator", async ({ page }) => {
  await entrar(page, "admin@internship.local", 248);
  await page.goto("/administracao/usuarios");
  await page.getByRole("main").getByRole("link").filter({ hasText: "@" }).first().click();
  await page.getByText("Dados da conta").waitFor();
  expect(await desalinhados(page)).toEqual([]);
  await page.goto("/administracao/parametros");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  expect(await desalinhados(page)).toEqual([]);
});

test("columns end on the same line for the coordination", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 249);
  await page.goto("/administracao/concedentes?busca=Empresa%20Exemplo%20de%20Software");
  await page.getByRole("link", { name: "Empresa Exemplo de Software Ltda" }).click();
  await page.getByTestId("convenios").waitFor();
  expect(await desalinhados(page)).toEqual([]);
  // Opening the edit form makes one column taller: the other follows
  await page.getByText("Editar dados").click();
  expect(await desalinhados(page)).toEqual([]);

  for (const tela of ["/dashboard", "/atividades-complementares"]) {
    await page.goto(tela);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    expect(await desalinhados(page), tela).toEqual([]);
  }
  await page.goto("/administracao/cursos");
  await page.getByTestId("cursos-lista").getByRole("link").first().click();
  await page.getByTestId("curso-edicao").waitFor();
  expect(await desalinhados(page)).toEqual([]);
});

test("columns end on the same line in every tab of an internship", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local", 250);
  await page.goto("/estagios?busca=Ana%20Estudante");
  await page.getByTestId("estagios-lista").getByRole("link").first().click();
  await page.getByTestId("carga-horaria").or(page.getByRole("heading", { level: 1 })).first().waitFor();
  const caminho = new URL(page.url()).pathname;
  for (const aba of ["", "?aba=formalizacao", "?aba=acompanhamento", "?aba=ocorrencias"]) {
    await page.goto(`${caminho}${aba}`);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    expect(await desalinhados(page), aba).toEqual([]);
  }
});
