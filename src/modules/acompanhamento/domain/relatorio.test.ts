import { describe, expect, it } from "vitest";
import { enviadoComAtraso, pendenteDe, relatorioEmAtraso } from "./relatorio";

describe("relatório em atraso (RF037, RF040, §8.6)", () => {
  it("is late only while owed and after the deadline", () => {
    expect(relatorioEmAtraso({ situacao: "PENDENTE", prazoEntrega: "2026-09-17" }, "2026-09-18")).toBe(true);
    expect(relatorioEmAtraso({ situacao: "DEVOLVIDO", prazoEntrega: "2026-09-17" }, "2026-09-18")).toBe(true);
    expect(relatorioEmAtraso({ situacao: "PENDENTE", prazoEntrega: "2026-09-17" }, "2026-09-17")).toBe(false);
    expect(relatorioEmAtraso({ situacao: "EM_ANALISE", prazoEntrega: "2026-09-17" }, "2026-10-01")).toBe(false);
    expect(relatorioEmAtraso({ situacao: "APROVADO", prazoEntrega: "2026-09-17" }, "2026-10-01")).toBe(false);
  });

  it("marks a version sent after the deadline day", () => {
    expect(enviadoComAtraso("2026-09-17", "2026-09-17")).toBe(false);
    expect(enviadoComAtraso("2026-09-17", "2026-09-18")).toBe(true);
  });

  it("says who acts next", () => {
    expect(pendenteDe("PENDENTE")).toBe("ESTUDANTE");
    expect(pendenteDe("DEVOLVIDO")).toBe("ESTUDANTE");
    expect(pendenteDe("EM_ANALISE")).toBe("ORIENTADOR");
    expect(pendenteDe("APROVADO")).toBeNull();
  });
});
