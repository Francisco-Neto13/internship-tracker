import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { gerarPdfDocumento, gerarPdfTabela } from "@/lib/pdf";
import { documentoAvaliacao, folhaFrequencia } from "./documento-acompanhamento";

const id = { estudanteNome: "Ana", matricula: "2026001", curso: "Engenharia", concedente: "Exemplo", cnpj: "11222333000181", convenio: "CV-1" };
const criterios = [{ id: "c1", descricao: "Pontualidade", escalaMinima: 1, escalaMaxima: 5 }];
const avaliacao = { momento: "FINAL", periodoInicio: null, periodoFim: null, observacoes: "Boa evolução", criadoEm: new Date("2026-12-01T15:00:00Z"), avaliadorNome: "Sérgio", media: 7.5, respostas: [{ criterioId: "c1", nota: 4, comentario: "Sempre no horário" }] };

describe("documentoAvaliacao (RF042, RF043)", () => {
  it("names the criteria and writes the average with a comma, without codes", async () => {
    const documento = documentoAvaliacao(avaliacao, criterios, id);
    const texto = JSON.stringify(documento);
    expect(documento.titulo).toBe("Avaliação Final de Desempenho");
    expect(texto).toContain('["Pontualidade","4 (escala de 1 a 5). Sempre no horário"]');
    expect(texto).toContain('["Média (0 a 10)","7,5"]');
    expect(texto).not.toContain("c1");
    expect((await PDFDocument.load(await gerarPdfDocumento(documento))).getPageCount()).toBe(1);
  });

  it("states the period of a periodic evaluation", () => {
    const documento = documentoAvaliacao({ ...avaliacao, momento: "PERIODICA", periodoInicio: "2026-08-03", periodoFim: "2026-09-02" }, criterios, id);
    expect(JSON.stringify(documento)).toContain("03/08/2026 a 02/09/2026");
  });
});

describe("folhaFrequencia (RF026)", () => {
  const lancamento = { horaEntrada: "08:00:00", horaSaida: "14:00:00", duracaoMinutos: 360 };
  const resumo = { minutosHomologados: 360, minutosPendentes: 330, cargaTotalMinutos: 24000 };
  const periodo = { dataInicio: "2026-08-03", dataFimPrevista: "2027-07-30" };

  it("lists the entries in force, oldest first, as people read them", async () => {
    const folha = folhaFrequencia(
      [
        { ...lancamento, data: "2026-08-04", situacao: "REGISTRADO", duracaoMinutos: 330, horaEntrada: null, horaSaida: null },
        { ...lancamento, data: "2026-08-03", situacao: "HOMOLOGADO" },
        { ...lancamento, data: "2026-08-05", situacao: "CANCELADO" },
        { ...lancamento, data: "2026-08-06", situacao: "SUBSTITUIDO" },
      ],
      resumo,
      id,
      periodo,
    );
    expect(folha.linhas).toEqual([
      ["03/08/2026", "6 h", "08:00 às 14:00", "Homologado"],
      ["04/08/2026", "5,5 h", "Sem horário", "Aguardando homologação"],
    ]);
    expect(folha.filtros).toContainEqual(["Carga homologada", "6 h de 400 h, com 5,5 h aguardando homologação"]);
    expect((await PDFDocument.load(await gerarPdfTabela(folha))).getPageCount()).toBe(1);
  });
});
