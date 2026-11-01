import { describe, expect, it } from "vitest";
import { documentoDeclaracao, gerarCodigoVerificacao, type DadosDeclaracao } from "./declaracao";

describe("gerarCodigoVerificacao (RF058)", () => {
  it("encodes 80 bits as four groups of base32", () => {
    expect(gerarCodigoVerificacao(new Uint8Array(10))).toBe("AAAA-AAAA-AAAA-AAAA");
    expect(gerarCodigoVerificacao(new Uint8Array(10).fill(255))).toBe("7777-7777-7777-7777");
    expect(gerarCodigoVerificacao()).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
  });
});

describe("documentoDeclaracao", () => {
  const base = { nome: "Ana Souza", matricula: "2026001", curso: "Engenharia de Software" };

  it("states the concluded internship with homologated hours and the code", () => {
    const dados: DadosDeclaracao = {
      ...base,
      tipo: "CONCLUSAO_ESTAGIO",
      tipo_estagio: "OBRIGATORIO",
      concedente: "Empresa Exemplo Ltda",
      cnpj: "12345678000195",
      data_inicio: "2026-08-03",
      data_fim: "2027-07-30",
      minutos_homologados: 24030,
      orientador: "Prof. Carlos",
    };
    const texto = JSON.stringify(documentoDeclaracao(dados, "ABCD-EFGH-IJKL-MNOP", "2027-08-02"));
    expect(texto).toContain("concluiu estágio obrigatório na concedente Empresa Exemplo Ltda (CNPJ 12.345.678/0001-95), de 03/08/2026 a 30/07/2027");
    expect(texto).toContain("400,5 h");
    expect(texto).toContain("sob orientação de Prof. Carlos");
    expect(texto).toContain("ABCD-EFGH-IJKL-MNOP");
  });

  it("states the complete activities with the hours of each category", () => {
    const dados: DadosDeclaracao = {
      ...base,
      tipo: "INTEGRALIZACAO_ATIVIDADES",
      apuracao_id: "x",
      apurado_em: "2027-06-10T12:00:00Z",
      minutos_exigidos: 12000,
      minutos_aproveitados: 12000,
      categorias: [{ categoria: "Extensão", minutos: 4800 }],
    };
    const texto = JSON.stringify(documentoDeclaracao(dados, "ABCD-EFGH-IJKL-MNOP", "2027-08-02"));
    expect(texto).toContain("integralizou 200 h de atividades complementares");
    expect(texto).toContain('["Extensão","80 h"]');
  });
});
