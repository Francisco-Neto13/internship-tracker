import { describe, expect, it } from "vitest";
import { rotuloCampo, rotuloOperacao, textoAuditoria, valorAuditoria } from "./auditoria-texto";

describe("the audit trail in plain words (RF066)", () => {
  it("turns columns into names with accents", () => {
    expect(rotuloCampo("data_fim_prevista")).toBe("Data fim prevista");
    expect(rotuloCampo("usuario_id")).toBe("Usuário");
    expect(rotuloCampo("situacao_academica")).toBe("Situação acadêmica");
    expect(rotuloCampo("carga_total_minutos")).toBe("Carga total");
    expect(rotuloCampo("justificativa_reabertura")).toBe("Justificativa reabertura");
    expect(rotuloCampo("decisao")).toBe("Decisão");
  });

  it("formats each kind of value", () => {
    expect(valorAuditoria("x", null)).toBe("Não informado");
    expect(valorAuditoria("ativa", true)).toBe("Sim");
    expect(valorAuditoria("carga_total_minutos", 24030)).toBe("400,5 h");
    expect(valorAuditoria("data_inicio", "2026-08-03")).toBe("03/08/2026");
    expect(valorAuditoria("criado_em", "2026-08-03T15:00:00+00:00")).toMatch(/^03\/08\/2026/);
    expect(valorAuditoria("estagio_id", "0f8fad5b-d9cb-469f-a165-70867728950e")).toBe("Referência 0f8fad5b");
  });

  it("names the codes, known or not, and says a masked value is protected", () => {
    expect(valorAuditoria("situacao", "EM_FORMALIZACAO")).toBe("Em formalização");
    expect(valorAuditoria("tipo", "NAO_OBRIGATORIO")).toBe("Não obrigatório");
    expect(valorAuditoria("papel", "ORIENTADOR")).toBe("Orientador");
    expect(valorAuditoria("conteudo", "[omitido]")).toBe("Protegido");
  });

  it("keeps free text as it was written", () => {
    expect(valorAuditoria("motivo", "Efetivação na empresa")).toBe("Efetivação na empresa");
    expect(valorAuditoria("uf", "SP")).toBe("SP");
    expect(valorAuditoria("matricula", "AB123")).toBe("AB123");
  });

  it("writes a row in one line, with nothing a spreadsheet would run", () => {
    expect(textoAuditoria({ matricula: "=1+1", ativo: false })).toBe("Matrícula: =1+1; Ativo: Não");
    expect(textoAuditoria(null)).toBe("");
  });

  it("names the operations", () => {
    expect(rotuloOperacao("INSERT")).toBe("Criado");
    expect(rotuloOperacao("LEITURA")).toBe("Lido");
  });
});
