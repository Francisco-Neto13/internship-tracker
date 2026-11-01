import { createHash } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { dados, erro, sessoes } from "./support/api";
import { criarEstagioAtivoDesdeAgosto } from "./support/estagio";

// Fase 5 end to end through the HTTP API: a leave extends the internship and blocks its days,
// the documents render as PDF, the rescission ends it and notifies, the management reports
// and the retention list answer by profile, and an unknown declaration code is not found.

const sessao = sessoes(170);

/** D8: signed PUT straight to the bucket, then the server checks the object. */
async function enviarAtestado(api: APIRequestContext, estagioId: string) {
  const pdf = Buffer.from(`%PDF-1.7\natestado ${estagioId}\n%%EOF`);
  const upload = await dados<{ upload_id: string; url: string; cabecalhos: Record<string, string> }>(
    await api.post("/api/v1/documentos/upload", {
      data: {
        tipo: "ATESTADO_AFASTAMENTO",
        tipo_mime: "application/pdf",
        tamanho_bytes: pdf.length,
        sha256: createHash("sha256").update(pdf).digest("hex"),
        nome_original: "atestado.pdf",
        estagio_id: estagioId,
      },
    }),
    201,
  );
  const envio = await api.put(upload.url, { data: pdf, headers: { "Content-Type": upload.cabecalhos["Content-Type"] } });
  expect(envio.ok(), "PUT direto ao bucket").toBe(true);
  return dados<{ id: string }>(await api.post("/api/v1/documentos/upload/confirmacao", { data: { upload_id: upload.upload_id } }), 201);
}

test("leave, documents, rescission, reports and retention through the API (Fase 5)", async ({ browser, request }) => {
  const { id, aluno, coordenacao, concedenteRh, admin } = await criarEstagioAtivoDesdeAgosto(browser, sessao, "fase5");
  const api = (caminho: string) => `/api/v1/estagios/${id}${caminho}`;

  // RF059, RF060: the student sends the certificate, the coordination registers the leave
  const atestado = await enviarAtestado(aluno, id);
  const afastamento = await dados<{ dias_corridos: number; dias_extensao: number; data_fim_prevista_nova: string }>(
    await coordenacao.post(api("/afastamentos"), { data: { tipo: "ATESTADO_MEDICO", data_inicio: "2026-09-07", data_fim: "2026-09-16", documento_id: atestado.id } }),
    201,
  );
  expect(afastamento).toMatchObject({ dias_corridos: 10, dias_extensao: 10, data_fim_prevista_nova: "2027-08-09" });
  expect((await dados<{ data_fim_prevista: string }>(await aluno.get(api("")))).data_fim_prevista).toBe("2027-08-09");
  expect((await erro(await aluno.post(api("/frequencias"), { data: { data: "2026-09-08", horas: 5 } }), 422)).code).toBe("DIA_EM_AFASTAMENTO");
  // The concedente sees the dates, never the row with type and description (RN-38)
  expect(await dados<unknown[]>(await concedenteRh.get(api("/afastamentos")))).toEqual([]);

  // RF022: the TCE renders as PDF for whoever reads the internship
  const tce = await concedenteRh.get(api("/tce/pdf"));
  expect(tce.status()).toBe(200);
  expect(tce.headers()["content-type"]).toBe("application/pdf");
  expect((await tce.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // RF063, RF064: rescission by the coordination, once
  await dados(await aluno.post(api("/frequencias"), { data: { data: "2026-08-03", horas: 5 } }), 201);
  const rescisao = await dados<{ horas_cumpridas_consolidadas: number }>(
    await coordenacao.post(api("/rescisao"), { data: { data_rescisao: "2026-08-05", solicitante: "ESTUDANTE", motivo: "Efetivação em outra empresa" } }),
    201,
  );
  expect(rescisao.horas_cumpridas_consolidadas).toBe(5);
  expect((await erro(await coordenacao.post(api("/rescisao"), { data: { data_rescisao: "2026-08-05", solicitante: "ESTUDANTE", motivo: "De novo" } }), 409)).code).toBe(
    "ESTAGIO_NAO_ATIVO",
  );
  expect((await dados<{ situacao: string }>(await aluno.get(api("")))).situacao).toBe("RESCINDIDO");
  const avisos = await dados<{ tipo: string; mensagem: string }[]>(await aluno.get("/api/v1/notificacoes?limite=50"));
  expect(avisos.some((aviso) => aviso.tipo === "MUDANCA_SITUACAO" && aviso.mensagem.includes("RESCINDIDO"))).toBe(true);

  // RF067, RF068: reports by profile, exported as CSV and PDF
  expect((await dados<{ rescindidos: number }[]>(await coordenacao.get("/api/v1/relatorios-gerenciais/taxa-conclusao"))).length).toBeGreaterThan(0);
  expect(await dados<unknown[]>(await aluno.get("/api/v1/relatorios-gerenciais/taxa-conclusao"))).toEqual([]);
  const csv = await coordenacao.get("/api/v1/relatorios-gerenciais/estagiarios-ativos/exportacao?formato=csv");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const pdf = await coordenacao.get("/api/v1/relatorios-gerenciais/estagiarios-ativos/exportacao?formato=pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // RF069: the retention list answers to the administrator only
  await dados<unknown[]>(await admin.get("/api/v1/guarda-documental"));
  expect(await dados<unknown[]>(await coordenacao.get("/api/v1/guarda-documental"))).toEqual([]);

  // RF058: public verification, a plain 404 for an unknown code
  expect((await request.get("/api/v1/declaracoes/verificacao/AAAA-AAAA-AAAA-AAAA")).status()).toBe(404);
});

test("the conclusion lists every impediment at once (RF045)", async ({ browser }) => {
  const { id, coordenacao } = await criarEstagioAtivoDesdeAgosto(browser, sessao, "conclusao");
  const bloqueio = await erro(await coordenacao.post(`/api/v1/estagios/${id}/conclusao`), 409);
  expect(bloqueio.code).toBe("CONCLUSAO_BLOQUEADA");
  expect(bloqueio.details?.map((item) => item.code).sort()).toEqual(["AVALIACAO_PENDENTE", "CARGA_MINIMA_NAO_CUMPRIDA", "RELATORIO_FINAL_PENDENTE"]);
});
