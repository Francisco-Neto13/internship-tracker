import { describe, expect, it } from "vitest";
import { BOM, celulaCsv, gerarCsv } from "./csv";

describe("celulaCsv (RF066, OWASP CSV Injection)", () => {
  it("quotes every field and doubles inner quotes", () => {
    expect(celulaCsv('diz "olá"; tchau')).toBe('"diz ""olá""; tchau"');
  });

  it.each(["=1+1", "+55", "-2", "@SUM(A1)", "\tcmd", "\rcmd"])("neutralizes %j as plain text", (valor) => {
    expect(celulaCsv(valor)).toBe(`"'${valor}"`);
  });

  it("neutralizes a formula hidden in a JSON value only where it starts the cell", () => {
    expect(celulaCsv({ nome: "=HYPERLINK()" })).toBe('"{""nome"":""=HYPERLINK()""}"');
  });

  it("writes dates as ISO 8601 and missing values as empty", () => {
    expect(celulaCsv(new Date("2026-10-20T12:00:00Z"))).toBe('"2026-10-20T12:00:00.000Z"');
    expect(celulaCsv(null)).toBe('""');
  });
});

describe("gerarCsv", () => {
  it("starts with a UTF-8 BOM, separates with semicolons and ends lines in CRLF", () => {
    expect(BOM.charCodeAt(0)).toBe(0xfeff);
    expect(gerarCsv(["a", "b"], [["ção", 1]])).toBe(`${BOM}"a";"b"\r\n"ção";"1"\r\n`);
  });
});
