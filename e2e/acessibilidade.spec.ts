import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// RNF-10: automated WCAG 2.1 A and AA rules on the screens of each profile, at desktop and phone
// width. It finds what a machine can (contrast, names, labels, structure); keyboard use and screen
// readers still need a person.

async function entrar(page: Page, email: string, finalDoEndereco: number) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${finalDoEndereco}` });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function violacoes(page: Page) {
  // A fading element reports the color of that instant, not the color people read
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
  const { violations } = await new AxeBuilder({ page }).exclude("[data-decorativo]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.map((item) => ({
    regra: item.id,
    impacto: item.impact,
    ocorrencias: item.nodes.slice(0, 8).map((no) => `${no.target.join(" ")} :: ${no.any[0]?.message ?? no.failureSummary ?? ""}`),
  }));
}

const PERFIS = [
  { perfil: "estudante", email: "ana.estudante@internship.local", final: 231, telas: ["/dashboard", "/estagios", "/frequencia", "/relatorios", "/atividades-complementares"] },
  { perfil: "coordenação", email: "coordenacao.software@internship.local", final: 232, telas: ["/dashboard", "/estagios", "/frequencia", "/relatorios", "/atividades-complementares", "/administracao/cursos", "/administracao/estudantes"] },
  { perfil: "orientador", email: "orientador@internship.local", final: 233, telas: ["/dashboard", "/estagios", "/frequencia", "/relatorios"] },
  { perfil: "supervisor", email: "supervisor@exemplo-software.local", final: 234, telas: ["/dashboard", "/estagios", "/frequencia"] },
  { perfil: "concedente", email: "rh@exemplo-software.local", final: 235, telas: ["/dashboard", "/estagios"] },
  { perfil: "administrador", email: "admin@internship.local", final: 236, telas: ["/dashboard", "/administracao/usuarios", "/administracao/auditoria", "/administracao/guarda-documental", "/administracao/relatorios-gerenciais"] },
];

test("the sign-in screen has no automatic WCAG violation", async ({ page }) => {
  await page.goto("/login");
  expect(await violacoes(page)).toEqual([]);
});

for (const { perfil, email, final, telas } of PERFIS) {
  test(`${perfil}: screens have no automatic WCAG violation`, async ({ page }) => {
    test.setTimeout(120_000);
    await entrar(page, email, final);
    const encontradas: Record<string, unknown> = {};
    for (const largura of [1280, 360]) {
      await page.setViewportSize({ width: largura, height: 800 });
      for (const tela of telas) {
        await page.goto(tela);
        await page.getByRole("heading", { level: 1 }).first().waitFor();
        const achados = await violacoes(page);
        if (achados.length > 0) encontradas[`${tela} @${largura}`] = achados;
      }
    }
    expect(encontradas).toEqual({});
  });
}

test("supervisor and concedente see who the intern is (issue #80)", async ({ page }) => {
  await entrar(page, "supervisor@exemplo-software.local", 237);
  await page.goto("/estagios?busca=Ana%20Estudante");
  await expect(page.getByTestId("estagios-lista")).toContainText("Ana Estudante");
  await page.goto("/frequencia?busca=Ana%20Estudante");
  await expect(page.getByTestId("estagios-ativos")).toContainText("Ana Estudante");

  await page.context().clearCookies();
  await entrar(page, "rh@exemplo-software.local", 238);
  await page.goto("/estagios?busca=Ana%20Estudante");
  await expect(page.getByTestId("estagios-lista")).toContainText("Ana Estudante");
});

// WCAG 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7: what a person using only a keyboard needs. A screen reader
// still needs a person.
test.describe("keyboard", () => {
  /** Who holds the focus, and whether something on screen shows it. */
  const foco = (page: Page) =>
    page.evaluate(() => {
      const elemento = document.activeElement as HTMLElement;
      const estilo = getComputedStyle(elemento);
      // A row link draws its ring on ::after, which covers the whole row
      const posterior = getComputedStyle(elemento, "::after");
      const contorno = estilo.outlineStyle !== "none" && parseFloat(estilo.outlineWidth) > 0;
      return {
        rotulo: `${elemento.tagName} ${elemento.getAttribute("type") ?? ""} ${elemento.id} ${(elemento.getAttribute("aria-label") ?? elemento.textContent ?? "").trim().slice(0, 40)}`,
        visivel: contorno || estilo.boxShadow !== "none" || posterior.boxShadow !== "none",
        corpo: elemento === document.body,
      };
    });

  test("signs in with the keyboard alone", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.239" });
    await page.goto("/login");
    await page.getByLabel("E-mail").focus();
    await page.keyboard.type("orientador@internship.local");
    await page.keyboard.press("Tab");
    await page.keyboard.type("senha-dev-internship");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the first Tab offers to skip the menu, and it lands on the content", async ({ page }) => {
    await entrar(page, "orientador@internship.local", 240);
    await page.goto("/estagios");
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(pular).toBeFocused();
    await expect(pular).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#conteudo")).toBeFocused();
  });

  for (const { perfil, email, final, tela } of [
    { perfil: "coordenação", email: "coordenacao.software@internship.local", final: 241, tela: "/administracao/estudantes" },
    { perfil: "estudante", email: "ana.estudante@internship.local", final: 242, tela: "/atividades-complementares" },
  ]) {
    test(`${perfil}: Tab walks the screen with visible focus and no trap`, async ({ page }) => {
      await entrar(page, email, final);
      await page.goto(tela);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      const semContorno: string[] = [];
      const vistos = new Set<string>();
      for (let passo = 0; passo < 45; passo += 1) {
        await page.keyboard.press("Tab");
        const atual = await foco(page);
        if (atual.corpo) continue;
        vistos.add(atual.rotulo);
        if (!atual.visivel) semContorno.push(atual.rotulo);
      }
      expect([...new Set(semContorno)]).toEqual([]);
      // More than a handful of different stops: the focus travels instead of being held
      expect(vistos.size).toBeGreaterThan(10);
    });
  }

  test("the account menu and its confirmation work with the keyboard and keep the focus inside", async ({ page }) => {
    await entrar(page, "orientador@internship.local", 243);
    const conta = page.getByRole("button", { name: /Conta de/ });
    await conta.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(conta).toBeFocused();

    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Sair" }).focus();
    await page.keyboard.press("Enter");
    const confirmacao = page.getByRole("alertdialog");
    await expect(confirmacao.getByRole("button", { name: "Cancelar" })).toBeFocused();
    // Tab goes around the two buttons and never reaches the page behind
    for (let passo = 0; passo < 4; passo += 1) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="alertdialog"]')))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(confirmacao).toHaveCount(0);
    await expect(conta).toBeFocused();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
