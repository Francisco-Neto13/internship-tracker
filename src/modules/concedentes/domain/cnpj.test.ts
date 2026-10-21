import { describe, expect, it } from "vitest";
import { cnpjValido, normalizarCnpj } from "./cnpj";

describe("CNPJ validation (RF007, IN RFB 2.229/2024)", () => {
  it("accepts the alphanumeric example published by the Receita Federal", () => {
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true);
  });

  it("keeps accepting numeric CNPJs with the same rule", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("00000000000191")).toBe(true);
  });

  it("rejects wrong check digits, letters in the check digits and repeated characters", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("12ABC34501DE3A")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
  });

  it("normalizes punctuation and case before storing", () => {
    expect(normalizarCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
});
