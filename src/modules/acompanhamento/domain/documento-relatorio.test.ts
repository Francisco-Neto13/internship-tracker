import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { gerarPdfDocumento } from "@/lib/pdf";
import { documentoRelatorio, nomeRelatorio } from "./documento-relatorio";

const relatorio = { tipo: "PERIODICO", sequencia: 2, periodoInicio: "2026-08-03", periodoFim: "2027-02-02", prazoEntrega: "2027-02-17", situacao: "EM_ANALISE", emAtraso: false };
const identificacao = { estudanteNome: "Ana", matricula: "2026001", curso: "Engenharia", concedente: "Exemplo", cnpj: "11222333000181", convenio: "CV-1" };
const versao = { numero: 1, conteudo: "Primeira linha\n\nSegunda linha", criadoEm: new Date("2026-09-01T15:00:00Z"), enviadaComAtraso: false, anexos: [], parecer: null };
const campos = (documento: ReturnType<typeof documentoRelatorio>, titulo: string) => documento.secoes.find((secao) => secao.titulo === titulo);

describe("documentoRelatorio (RF037 to RF039)", () => {
  it("shows dates and situations as people read them, never codes", () => {
    const texto = JSON.stringify(documentoRelatorio(relatorio, [versao], identificacao));
    expect(texto).toContain("03/08/2026 a 02/02/2027");
    expect(texto).toContain("Em análise");
    expect(texto).not.toContain("EM_ANALISE");
    expect(texto).not.toContain("2026-08-03");
  });

  it("keeps each line of the text as a paragraph", () => {
    expect(campos(documentoRelatorio(relatorio, [versao], identificacao), "Atividades do período")?.paragrafos).toEqual(["Primeira linha", "Segunda linha"]);
  });

  it("says where the content is when the version has only attachments", () => {
    const documento = documentoRelatorio(relatorio, [{ ...versao, conteudo: null, anexos: [{ nomeOriginal: "relatorio.pdf" }] }], identificacao);
    expect(campos(documento, "Atividades do período")?.paragrafos).toEqual(["O conteúdo desta versão está nos anexos."]);
    expect(campos(documento, "Anexos")?.paragrafos).toEqual(["relatorio.pdf"]);
  });

  it("uses the latest version and keeps the earlier ones with their opinion", () => {
    const parecer = { decisao: "DEVOLVIDO", texto: "Detalhar as atividades", emitidoPorNome: "Olga", criadoEm: new Date("2026-09-02T15:00:00Z") };
    const documento = documentoRelatorio(relatorio, [{ ...versao, numero: 2, conteudo: "Corrigido" }, { ...versao, parecer }], identificacao);
    expect(documento.subtitulo).toContain("versão 2");
    expect(campos(documento, "Atividades do período")?.paragrafos).toEqual(["Corrigido"]);
    expect(campos(documento, "Versões anteriores")?.campos?.[0][1]).toBe("Devolvido: Detalhar as atividades");
  });

  it("names the final report and renders a valid PDF", async () => {
    expect(nomeRelatorio({ tipo: "FINAL", sequencia: 1 })).toBe("Relatório final");
    const pdf = await PDFDocument.load(await gerarPdfDocumento(documentoRelatorio(relatorio, [versao], identificacao)));
    expect(pdf.getPageCount()).toBe(1);
  });
});
