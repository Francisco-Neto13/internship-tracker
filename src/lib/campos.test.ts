import { describe, expect, it } from "vitest";
import { createCursoBodySchema } from "@/modules/academico/schemas/curso";
import { createConcedenteBodySchema, suspensaoBodySchema } from "@/modules/concedentes/schemas/concedente";
import { cancelamentoBodySchema } from "@/modules/acompanhamento/schemas/frequencia";
import { HORAS_CURSO_MAXIMO, LIMITE, UFS, dataSchema } from "./campos";
import { lerConsulta } from "./consulta";

// Issue #97: each hole found in the review, forced to fail. The screen only helps; these rules are
// what someone calling the API without the screen meets.

const concedente = {
  razao_social: "Empresa",
  cnpj: "11222333000181",
  logradouro: "Rua",
  numero_endereco: "1",
  bairro: "Centro",
  municipio: "Maceió",
  uf: "AL",
  cep: "57050000",
  email_contato: "a@b.local",
  representante_legal_nome: "Pessoa",
  area_atuacao: "Software",
};
const aceita = (ajustes: Record<string, unknown>) => createConcedenteBodySchema.safeParse({ ...concedente, ...ajustes }).success;

describe("CEP", () => {
  it("takes the two usual ways of writing it", () => {
    expect(createConcedenteBodySchema.parse(concedente).cep).toBe("57050000");
    expect(createConcedenteBodySchema.parse({ ...concedente, cep: "57050-000" }).cep).toBe("57050000");
  });

  it("no longer throws away what is not a digit", () => {
    expect(aceita({ cep: "abc57050-000xyz" })).toBe(false);
    expect(aceita({ cep: `${"1".repeat(8)} ${"x".repeat(5000)}` })).toBe(false);
    expect(aceita({ cep: "5705000" })).toBe(false);
  });
});

describe("UF and phone", () => {
  it("accepts only states that exist", () => {
    expect(UFS).toHaveLength(27);
    expect(aceita({ uf: "al" })).toBe(true);
    expect(aceita({ uf: "ZZ" })).toBe(false);
  });

  it("refuses words in a phone and keeps it optional", () => {
    expect(aceita({ telefone_contato: "(82) 99999-8888" })).toBe(true);
    expect(aceita({ telefone_contato: "ligar depois" })).toBe(false);
    expect(aceita({ telefone_contato: "1".repeat(LIMITE.telefone + 1) })).toBe(false);
    expect(createConcedenteBodySchema.parse(concedente).telefone_contato).toBeNull();
  });
});

describe("limits that were missing or differed from the screen", () => {
  it("the hours of a course have a ceiling", () => {
    const curso = { codigo: "X", nome: "Curso", carga_minima_estagio_horas: 400, carga_atividades_complementares_horas: 200 };
    expect(createCursoBodySchema.safeParse(curso).success).toBe(true);
    expect(createCursoBodySchema.safeParse({ ...curso, carga_minima_estagio_horas: HORAS_CURSO_MAXIMO + 1 }).success).toBe(false);
    expect(createCursoBodySchema.safeParse({ ...curso, carga_atividades_complementares_horas: HORAS_CURSO_MAXIMO + 1 }).success).toBe(false);
  });

  it("the limit given to the screen is the one the server applies", () => {
    expect(suspensaoBodySchema.safeParse({ motivo: "x".repeat(LIMITE.motivoSuspensao) }).success).toBe(true);
    expect(suspensaoBodySchema.safeParse({ motivo: "x".repeat(LIMITE.motivoSuspensao + 1) }).success).toBe(false);
    expect(cancelamentoBodySchema.safeParse({ justificativa: "x".repeat(LIMITE.motivoCancelamento) }).success).toBe(true);
    expect(cancelamentoBodySchema.safeParse({ justificativa: "x".repeat(LIMITE.motivoCancelamento + 1) }).success).toBe(false);
  });

  it("a date stays in a range that makes sense", () => {
    expect(dataSchema.safeParse("2026-11-04").success).toBe(true);
    expect(dataSchema.safeParse("0026-11-04").success).toBe(false);
    expect(dataSchema.safeParse("9999-12-31").success).toBe(false);
    expect(dataSchema.safeParse("2026-02-31").success).toBe(false);
  });

  it("a search from an edited link is cut before reaching the database", () => {
    expect(lerConsulta({ busca: "x".repeat(5000) }).busca).toHaveLength(LIMITE.busca);
    expect(lerConsulta({ busca: "ana" }).busca).toBe("ana");
  });
});
