import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// Fase 2 screens render for coordination, and the browser upload (D8: hash in the browser,
// signed PUT straight to the bucket with CORS, server confirmation) works from the UI.

test("coordination opens the Fase 2 screens and registers an agreement with its PDF", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("coordenacao.software@internship.local");
  await page.getByLabel("Senha", { exact: true }).fill("senha-dev-internship");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const [rota, titulo] of [
    ["/administracao/parametros", "Parâmetros institucionais"],
    ["/administracao/convenios", "Convênios a vencer"],
    ["/estagios", "Estágios"],
    ["/administracao/cursos", "Cursos"],
    ["/administracao/estudantes", "Estudantes"],
  ] as const) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
  }

  // Course and student edit screens (RF004, RF005)
  await page.goto("/administracao/cursos");
  await page.getByTestId("cursos-lista").getByRole("link").first().click();
  await expect(page.getByTestId("curso-edicao")).toBeVisible();
  await page.goto("/administracao/estudantes");
  await page.getByTestId("estudantes-lista").getByRole("link").first().click();
  await expect(page.getByTestId("estudante-edicao")).toBeVisible();

  // Concedente page and the agreement upload through the browser
  await page.goto("/administracao/concedentes");
  await page.getByRole("link", { name: "Empresa Exemplo de Software Ltda" }).click();
  await expect(page.getByTestId("convenios")).toContainText("CV-2026-0001");

  const numero = `CV-UI-${randomUUID().slice(0, 6)}`;
  await page.getByLabel("Número").fill(numero);
  await page.getByLabel("Início da vigência").fill("2031-01-01");
  await page.getByLabel("Fim da vigência").fill("2031-12-31");
  await page.getByLabel(/Convênio assinado/).setInputFiles({
    name: "convenio.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(`%PDF-1.7\nconvenio pela tela ${numero}\n%%EOF`),
  });
  await expect(page.getByText(/^Enviado: convenio\.pdf/)).toBeVisible();
  await page.getByRole("button", { name: "Registrar convênio" }).click();
  await expect(page.getByTestId("convenios")).toContainText(numero);
});
