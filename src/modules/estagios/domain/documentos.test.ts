import { describe, expect, it } from "vitest";
import { documentoAditivo, documentoPlano, documentoTce } from "./documentos";

// The documents people receive carry the names of the screens, never codes or internal ids.

const id = { estudanteNome: "Ana", matricula: "2026001", curso: "Engenharia", concedente: "Exemplo", cnpj: "11222333000181", convenio: "CV-1" };
const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";
const semCodigos = (documento: object) => {
  const texto = JSON.stringify(documento);
  expect(texto).not.toMatch(/EM_FORMALIZACAO|AGUARDANDO_|"CONCEDENTE"|APROVADO\b/);
  expect(texto).not.toContain(uuid);
};

describe("institutional documents (RF022)", () => {
  it("the TCE shows the situation and the policy holder by name", () => {
    const estagio = {
      id: uuid, tipo: "OBRIGATORIO" as const, situacao: "EM_FORMALIZACAO", dataInicio: "2026-08-03", dataFimPactuada: "2027-07-30", dataFimPrevista: "2027-07-30",
      cargaDiariaMinutos: 360, cargaSemanalMinutos: 1800, cargaTotalMinutos: 24000, condicoesPactuadas: "Condições", bolsaValor: null, auxilioTransporteValor: null, seguroExigido: true, hashTce: null,
    };
    const apolice = { seguradora: "Seg", numeroApolice: "1", contratante: "CONCEDENTE", vigenciaInicio: "2026-08-01", vigenciaFim: "2027-08-01" };
    const documento = documentoTce(estagio, id, { responsaveis: [], apolice, assinaturas: [] });
    semCodigos(documento);
    expect(documento.subtitulo).toContain("em formalização");
    expect(JSON.stringify(documento)).toContain('["Contratante","Concedente"]');
  });

  it("the plan and the amendment show their situation by name", () => {
    const plano = { versao: 1, situacao: "AGUARDANDO_APROVACAO", atividadesPrevistas: "A", justificativaCompatibilidade: "B", parecer: null, decididoEm: null };
    semCodigos(documentoPlano(plano, id, null));
    const aditivo = {
      id: uuid, numero: 1, tipo: "PRORROGACAO", situacao: "AGUARDANDO_ASSINATURAS", justificativa: "J", novaDataFimPactuada: "2027-12-30",
      novaCargaDiariaMinutos: null, novaCargaSemanalMinutos: null, novaCargaTotalMinutos: null, hashConteudo: "abc", efetivadoEm: null,
    };
    semCodigos(documentoAditivo(aditivo, id, null, []));
  });
});
