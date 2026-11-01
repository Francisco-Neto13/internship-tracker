import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { gerarPdfDocumento, gerarPdfTabela, quebrarTexto } from "./pdf";

describe("quebrarTexto", () => {
  it("breaks by words within the width and cuts a word longer than the line", async () => {
    const fonte = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const linhas = quebrarTexto(fonte, "Desenvolvimento de software sob supervisão", 10, 80);
    expect(linhas.length).toBeGreaterThan(1);
    for (const linha of linhas) expect(fonte.widthOfTextAtSize(linha, 10)).toBeLessThanOrEqual(80);
    expect(quebrarTexto(fonte, "a".repeat(200), 10, 50).every((linha) => fonte.widthOfTextAtSize(linha, 10) <= 50)).toBe(true);
  });

  it("keeps Portuguese accents and replaces what WinAnsi cannot encode", async () => {
    const fonte = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    expect(quebrarTexto(fonte, "Coordenação ção õ é", 10, 500)).toEqual(["Coordenação ção õ é"]);
    expect(quebrarTexto(fonte, "ok 漢字", 10, 500)).toEqual(["ok ??"]);
  });
});

describe("gerarPdfTabela e gerarPdfDocumento", () => {
  it("paginates a long table and repeats nothing when empty", async () => {
    const linhas = Array.from({ length: 120 }, (_, indice) => [`Curso ${indice}`, "Concedente Exemplo S.A.", "OBRIGATORIO", String(indice)]);
    const longa = await PDFDocument.load(await gerarPdfTabela({ titulo: "Estagiários ativos", filtros: [["Período", "início a hoje"]], cabecalho: ["Curso", "Concedente", "Tipo", "Qtd"], linhas, rodape: "teste" }));
    expect(longa.getPageCount()).toBeGreaterThan(1);
    const vazia = await PDFDocument.load(await gerarPdfTabela({ titulo: "Vazio", filtros: [], cabecalho: ["A"], linhas: [], rodape: "teste" }));
    expect(vazia.getPageCount()).toBe(1);
  });

  it("produces the same bytes for the same content", async () => {
    const documento = { titulo: "Declaração", secoes: [{ titulo: "Dados", campos: [["Nome", "Ana"]] as [string, string][], paragrafos: ["Texto."] }], rodape: "x" };
    expect(Buffer.from(await gerarPdfDocumento(documento)).equals(Buffer.from(await gerarPdfDocumento(documento)))).toBe(true);
  });
});
