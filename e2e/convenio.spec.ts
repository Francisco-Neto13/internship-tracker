import { createHash, randomUUID } from "node:crypto";
import { expect, test, type Browser } from "@playwright/test";

// RF007, RF009, D8 end to end, through the real bucket (SeaweedFS locally and in CI):
// concedente, signed upload of the agreement PDF, confirmation, agreement, download.

const SEED_PASSWORD = "senha-dev-internship";
const COORDENACAO = "coordenacao.software@internship.local";

function cnpjAleatorio(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  const dv = (corpo: string, pesos: number[]) => {
    const resto = [...corpo].reduce((total, c, i) => total + Number(c) * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${primeiro}${dv(base + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])}`;
}

// A client address of its own keeps this spec off the sign-in budget of the others
function contextoProprio(browser: Browser) {
  return browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.11" } });
}

test("coordination registers a concedente and an agreement with its signed PDF (RF007, RF009, D8)", async ({ browser }) => {
  const contexto = await contextoProprio(browser);
  const page = await contexto.newPage();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(COORDENACAO);
  await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const concedente = await page.request.post("/api/v1/concedentes", {
    data: {
      razao_social: `Empresa E2E ${randomUUID().slice(0, 6)}`,
      cnpj: cnpjAleatorio(),
      logradouro: "Rua do Sol",
      numero_endereco: "1",
      bairro: "Centro",
      municipio: "Maceió",
      uf: "AL",
      cep: "57020-000",
      email_contato: "rh@empresa-e2e.local",
      representante_legal_nome: "Fulana",
      area_atuacao: "Tecnologia",
    },
  });
  expect(concedente.status()).toBe(201);
  const { data: criada } = (await concedente.json()) as { data: { id: string; situacao: string } };
  expect(criada.situacao).toBe("ATIVA");

  const pdf = Buffer.from(`%PDF-1.7\nconvenio e2e ${randomUUID()}\n%%EOF`);
  const pedido = await page.request.post("/api/v1/documentos/upload", {
    data: {
      tipo: "CONVENIO",
      tipo_mime: "application/pdf",
      tamanho_bytes: pdf.length,
      sha256: createHash("sha256").update(pdf).digest("hex"),
      nome_original: "convenio.pdf",
      concedente_id: criada.id,
    },
  });
  expect(pedido.status()).toBe(201);
  const { data: upload } = (await pedido.json()) as { data: { upload_id: string; url: string; cabecalhos: Record<string, string> } };

  const envio = await page.request.put(upload.url, { data: pdf, headers: { "Content-Type": upload.cabecalhos["Content-Type"] } });
  expect(envio.ok()).toBe(true);

  const confirmacao = await page.request.post("/api/v1/documentos/upload/confirmacao", { data: { upload_id: upload.upload_id } });
  expect(confirmacao.status()).toBe(201);
  const { data: documento } = (await confirmacao.json()) as { data: { id: string } };

  const convenio = await page.request.post(`/api/v1/concedentes/${criada.id}/convenios`, {
    data: { numero: `CV-E2E-${randomUUID().slice(0, 8)}`, vigencia_inicio: "2026-01-01", vigencia_fim: "2030-12-31", documento_id: documento.id },
  });
  expect(convenio.status()).toBe(201);
  expect(((await convenio.json()) as { data: { vigente_hoje: boolean } }).data.vigente_hoje).toBe(true);

  const detalhe = await page.request.get(`/api/v1/documentos/${documento.id}`);
  const { data: comUrl } = (await detalhe.json()) as { data: { url_download: string } };
  const baixado = await page.request.get(comUrl.url_download);
  expect(Buffer.from(await baixado.body()).equals(pdf)).toBe(true);
  await contexto.close();
});
