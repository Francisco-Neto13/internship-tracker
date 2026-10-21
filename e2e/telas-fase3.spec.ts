import { expect, test } from "@playwright/test";

// Fase 3 screens render for coordination with the seeded ATIVO internship of Ana (August
// entries, first two weeks homologated, reports generated on activation). Signs in from an
// address of its own, off the shared sign-in budget; it uploads nothing, so the extra header
// never reaches the bucket (AGENTS.md, pitfalls).

test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.120" } });

test("coordination follows hours and reports of an active internship", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("coordenacao.software@internship.local");
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatórios", level: 1 })).toBeVisible();

  await page.goto("/frequencia");
  await expect(page.getByRole("heading", { name: "Frequência e carga horária", level: 1 })).toBeVisible();
  await page.getByTestId("estagios-ativos").getByRole("link", { name: /Ana Estudante/ }).click();

  await expect(page.getByTestId("carga-horaria")).toContainText("Homologadas");
  await expect(page.getByTestId("frequencias")).toContainText("Homologado");
  await expect(page.getByTestId("relatorios")).toContainText("Relatório final");
});
