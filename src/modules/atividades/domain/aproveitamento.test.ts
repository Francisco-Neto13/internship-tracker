import { describe, expect, it } from "vitest";
import { calcularAproveitamento, periodoValido } from "./aproveitamento";

const base = { declaradosMinutos: 40 * 60, limiteCategoriaMinutos: 60 * 60, jaAproveitadoNaCategoriaMinutos: 0, totalCursoMinutos: 200 * 60, jaAproveitadoNoTotalMinutos: 0 };

describe("calcularAproveitamento (RF051, RN-23)", () => {
  it("counts everything that fits", () => {
    expect(calcularAproveitamento(base)).toEqual({ aproveitadosMinutos: 2400, excedentesMinutos: 0, limitadoPor: null });
  });

  it("stops at what is left of the category limit", () => {
    expect(calcularAproveitamento({ ...base, jaAproveitadoNaCategoriaMinutos: 30 * 60 })).toEqual({
      aproveitadosMinutos: 1800,
      excedentesMinutos: 600,
      limitadoPor: "CATEGORIA",
    });
  });

  it("stops at what is left of the course total", () => {
    expect(calcularAproveitamento({ ...base, jaAproveitadoNoTotalMinutos: 190 * 60 })).toEqual({
      aproveitadosMinutos: 600,
      excedentesMinutos: 1800,
      limitadoPor: "TOTAL_DO_CURSO",
    });
  });

  it("counts nothing once a bound is reached, never below zero", () => {
    expect(calcularAproveitamento({ ...base, jaAproveitadoNaCategoriaMinutos: 70 * 60 })).toEqual({
      aproveitadosMinutos: 0,
      excedentesMinutos: 2400,
      limitadoPor: "CATEGORIA",
    });
  });

  it("blames the category when both bounds cut the same", () => {
    expect(calcularAproveitamento({ ...base, limiteCategoriaMinutos: 600, totalCursoMinutos: 600 }).limitadoPor).toBe("CATEGORIA");
  });
});

describe("periodoValido (RF049)", () => {
  it("accepts a finished activity, refuses a future end or an inverted period", () => {
    expect(periodoValido("2026-05-01", "2026-05-03", "2026-11-01")).toBe("OK");
    expect(periodoValido("2026-05-01", "2026-11-01", "2026-11-01")).toBe("OK");
    expect(periodoValido("2026-10-01", "2026-11-02", "2026-11-01")).toBe("ATIVIDADE_FUTURA");
    expect(periodoValido("2026-05-03", "2026-05-01", "2026-11-01")).toBe("PERIODO_INVALIDO");
  });
});
