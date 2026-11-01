import { expect, test } from "@playwright/test";

// Fase 5 screens render for the seeded coordination and administrator: management reports
// with their exports, the retention list and the Fase 5 blocks of an internship page.
// Signs in from an address of its own; it uploads nothing, so the header never reaches the bucket.

test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.190" } });

async function entrar(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("the coordination opens the management reports and an internship", async ({ page }) => {
  await entrar(page, "coordenacao.software@internship.local");
  await page.goto("/administracao/relatorios-gerenciais?tipo=pendencias-integralizacao");
  await expect(page.getByRole("heading", { name: "Relatórios gerenciais", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exportar PDF" })).toHaveAttribute("href", /formato=pdf/);
  await expect(page.getByTestId("relatorio-gerencial")).toContainText("Estudante");

  await page.goto("/estagios");
  await page.getByRole("link", { name: "Ana Estudante" }).first().click();
  await expect(page.getByTestId("documentos-estagio")).toContainText("TCE (PDF)");
});

test("the administrator opens the retention list", async ({ page }) => {
  await entrar(page, "admin@internship.local");
  await page.goto("/administracao/guarda-documental");
  await expect(page.getByRole("heading", { name: "Guarda documental", level: 1 })).toBeVisible();
});
