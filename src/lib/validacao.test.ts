import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createConcedenteBodySchema } from "@/modules/concedentes/schemas/concedente";
import { VALIDACOES } from "@/shared/ui/validacoes";
import { errosPorCampo } from "./validacao";

const concedente = {
  razao_social: "Empresa",
  cnpj: "11.222.333/0001-81",
  logradouro: "Rua",
  numero_endereco: "1",
  bairro: "Centro",
  municipio: "Maceió",
  uf: "AL",
  cep: "57050-000",
  email_contato: "a@b.local",
  representante_legal_nome: "Pessoa",
  area_atuacao: "Software",
};

describe("errosPorCampo", () => {
  it("says nothing about a valid form", () => {
    expect(errosPorCampo(createConcedenteBodySchema, concedente)).toEqual({});
  });

  it("speaks the language of the screen, by field", () => {
    const erros = errosPorCampo(createConcedenteBodySchema, { ...concedente, razao_social: "", email_contato: "nao-e-email", uf: "ZZ", cep: "123" });
    expect(erros).toEqual({
      razao_social: "Preencha este campo",
      email_contato: "Informe um e-mail válido",
      uf: "Escolha uma UF válida",
      cep: "CEP com 8 dígitos",
    });
  });

  it("a field left out asks to be filled, and limits say the number", () => {
    const schema = z.object({ nome: z.string().trim().min(1).max(5), horas: z.number().min(0.25).max(24), inteiro: z.number().min(2) });
    expect(errosPorCampo(schema, {})).toEqual({ nome: "Preencha este campo", horas: "Preencha este campo", inteiro: "Preencha este campo" });
    expect(errosPorCampo(schema, { nome: "abcdefgh", horas: 99, inteiro: 1 })).toEqual({ nome: "Use no máximo 5 caracteres", horas: "O valor máximo é 24", inteiro: "O valor mínimo é 2" });
    expect(errosPorCampo(schema, { nome: "a", horas: 0, inteiro: 2 }).horas).toBe("Informe um valor maior que zero");
  });

  it("finds the field inside a list", () => {
    const schema = z.object({ itens: z.array(z.object({ limite: z.number().max(10) })) });
    expect(errosPorCampo(schema, { itens: [{ limite: 11 }] })).toEqual({ limite: "O valor máximo é 10" });
  });
});

describe("regra da tela", () => {
  it("checks the digits of a CNPJ before sending, letters included", () => {
    const novo = VALIDACOES.concedenteNovo;
    expect(errosPorCampo(novo, concedente)).toEqual({});
    expect(errosPorCampo(novo, { ...concedente, cnpj: "12.ABC.345/01DE-35" })).toEqual({});
    expect(errosPorCampo(novo, { ...concedente, cnpj: "AA.AAA.AAA/AAAA" }).cnpj).toBe("CNPJ inválido");
    expect(errosPorCampo(novo, { ...concedente, cnpj: "11.222.333/0001-82" }).cnpj).toBe("CNPJ inválido");
  });

  it("reports the CNPJ even when other fields are still empty", () => {
    expect(errosPorCampo(VALIDACOES.concedenteNovo, { cnpj: "123" }).cnpj).toBe("CNPJ inválido");
  });
});
