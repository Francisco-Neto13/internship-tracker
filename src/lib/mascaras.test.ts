import { describe, expect, it } from "vitest";
import { cnpjValido } from "@/modules/concedentes/domain/cnpj";
import { aplicarMascara } from "./mascaras";

describe("aplicarMascara", () => {
  it("formats a CNPJ and takes letters only where they are valid", () => {
    expect(aplicarMascara("cnpj", "11222333000181")).toBe("11.222.333/0001-81");
    expect(aplicarMascara("cnpj", "12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(aplicarMascara("cnpj", "12.ABC.345/01DE-XY")).toBe("12.ABC.345/01DE");
    expect(aplicarMascara("cnpj", "1".repeat(40))).toHaveLength(18);
  });

  it("a formatted CNPJ still passes the check of the domain", () => {
    expect(cnpjValido(aplicarMascara("cnpj", "12abc34501de35"))).toBe(true);
  });

  it("keeps only digits in a CEP, up to 8", () => {
    expect(aplicarMascara("cep", "abc57050000xyz999")).toBe("57050-000");
    expect(aplicarMascara("cep", "570")).toBe("570");
  });

  it("formats landline and mobile phones", () => {
    expect(aplicarMascara("telefone", "82999998888")).toBe("(82) 99999-8888");
    expect(aplicarMascara("telefone", "8233334444")).toBe("(82) 3333-4444");
    expect(aplicarMascara("telefone", "abc")).toBe("");
  });
});
