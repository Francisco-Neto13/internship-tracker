import { expect, test } from "@playwright/test";

// Fase 4 screens render for the seeded student Ana (Engenharia de Software, with the RN-19
// categories): registration form of complementary activities and the integralization progress.
// Signs in from an address of its own; it uploads nothing, so the header never reaches the bucket.

test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.150" } });

test("the student opens complementary activities and integralization", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("ana.estudante@internship.local");
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/atividades-complementares");
  await expect(page.getByRole("heading", { name: "Atividades complementares", level: 1 })).toBeVisible();
  await expect(page.getByTestId("nova-atividade").getByLabel("Categoria")).toContainText("Cursos livres");

  await page.goto("/integralizacao");
  await expect(page.getByRole("heading", { name: "Integralização curricular", level: 1 })).toBeVisible();
  await expect(page.getByTestId("integralizacao")).toContainText("Atividades complementares");
  await expect(page.getByTestId("integralizacao")).toContainText("Extensão");
});
