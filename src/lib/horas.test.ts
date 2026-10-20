import { describe, expect, it } from "vitest";
import { horasParaMinutos, horasSchema, minutosParaHoras } from "./horas";

describe("hours and minutes (AGENTS.md conventions)", () => {
  it("converts hours to whole minutes and back", () => {
    expect(horasParaMinutos(6.5)).toBe(390);
    expect(horasParaMinutos(0.25)).toBe(15);
    expect(minutosParaHoras(390)).toBe(6.5);
  });

  it("accepts only durations that are whole minutes, within bounds", () => {
    const schema = horasSchema({ min: 1, max: 24 });
    expect(schema.safeParse(6.5).success).toBe(true);
    expect(schema.safeParse(1 / 3).success).toBe(false);
    expect(schema.safeParse(6.01).success).toBe(false);
    expect(schema.safeParse(25).success).toBe(false);
    expect(schema.safeParse(0.5).success).toBe(false);
  });
});
