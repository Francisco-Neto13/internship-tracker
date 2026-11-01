import { describe, expect, it } from "vitest";
import { progresso } from "./progresso";

const base = {
  estagioExigidoMinutos: 400 * 60,
  estagioConcluidoMinutos: 0,
  atividadesExigidoMinutos: 200 * 60,
  atividadesAproveitadoMinutos: 145 * 60,
  categorias: [
    { categoriaId: "ensino", limiteMinutos: 60 * 60, aproveitadoMinutos: 60 * 60 },
    { categoriaId: "pesquisa", limiteMinutos: 60 * 60, aproveitadoMinutos: 40 * 60 },
    { categoriaId: "extensao", limiteMinutos: 80 * 60, aproveitadoMinutos: 45 * 60 },
  ],
};

describe("progresso (RF057, RN-24)", () => {
  it("shows what is left and the categories that still accept hours", () => {
    expect(progresso(base)).toEqual({
      estagio: { situacao: "PENDENTE", pendenteMinutos: 400 * 60 },
      atividades: { situacao: "PENDENTE", pendenteMinutos: 55 * 60, categoriasPendentes: ["pesquisa", "extensao"] },
      situacaoGeral: "PENDENTE",
    });
  });

  it("is fulfilled only when both sides are", () => {
    expect(progresso({ ...base, estagioConcluidoMinutos: 400 * 60, atividadesAproveitadoMinutos: 200 * 60 }).situacaoGeral).toBe("CUMPRIDO");
    expect(progresso({ ...base, estagioConcluidoMinutos: 420 * 60 }).estagio).toEqual({ situacao: "CUMPRIDO", pendenteMinutos: 0 });
  });

  it("a course that requires nothing is fulfilled", () => {
    expect(progresso({ ...base, estagioExigidoMinutos: 0, atividadesExigidoMinutos: 0, atividadesAproveitadoMinutos: 0, categorias: [] }).situacaoGeral).toBe("CUMPRIDO");
  });
});
