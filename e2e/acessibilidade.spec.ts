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

test("the main screen of each profile shows content of its own", async ({ page }) => {
  await entrar(page, "supervisor@exemplo-software.local", 237);
  await expect(page.getByRole("main")).toContainText(/estagi/i);
  await page.goto("/frequencia");
  await expect(page.getByTestId("estagios-ativos")).toBeVisible();
});
