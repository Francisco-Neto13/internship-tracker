import { describe, expect, it } from "vitest";
import { codigoDoCriterio, conferirRespostas, mediaNormalizada } from "./avaliacao";

describe("codigoDoCriterio (RF042)", () => {
  it("derives the code the schema accepts from the description", () => {
    expect(codigoDoCriterio("Pontualidade e assiduidade")).toBe("PONTUALIDADE_E_ASSIDUIDADE");
    expect(codigoDoCriterio("  Comunicação / trabalho em equipe! ")).toBe("COMUNICACAO_TRABALHO_EM_EQUIPE");
    expect(codigoDoCriterio("x".repeat(60))).toHaveLength(40);
    expect(codigoDoCriterio("!!!")).toBe("CRITERIO");
  });
});

const criterios = [
  { id: "a", escalaMinima: 1, escalaMaxima: 5, ativo: true },
  { id: "b", escalaMinima: 0, escalaMaxima: 10, ativo: true },
  { id: "c", escalaMinima: 1, escalaMaxima: 5, ativo: false },
];

describe("conferirRespostas (RF042)", () => {
  it("accepts every active criterion answered within its scale", () => {
    expect(conferirRespostas(criterios, [{ criterioId: "a", nota: 5 }, { criterioId: "b", nota: 0 }])).toEqual([]);
  });

  it("lists every problem at once", () => {
    expect(
      conferirRespostas(criterios, [
        { criterioId: "a", nota: 6 },
        { criterioId: "a", nota: 3 },
        { criterioId: "c", nota: 3 },
      ]),
    ).toEqual([
      { code: "NOTA_FORA_DA_ESCALA", criterioId: "a", nota: 6 },
      { code: "CRITERIO_REPETIDO", criterioId: "a" },
      { code: "CRITERIO_INATIVO", criterioId: "c" },
      { code: "CRITERIO_AUSENTE", criterioId: "b" },
    ]);
  });

  it("refuses a fractional grade", () => {
    expect(conferirRespostas(criterios, [{ criterioId: "a", nota: 3.5 }, { criterioId: "b", nota: 7 }])).toEqual([
      { code: "NOTA_FORA_DA_ESCALA", criterioId: "a", nota: 3.5 },
    ]);
  });
});

describe("mediaNormalizada (RF014)", () => {
  it("brings every scale to 0..10 before averaging", () => {
    // 4 of 1..5 is 7.5; 6 of 0..10 is 6
    expect(mediaNormalizada([{ nota: 4, escalaMinima: 1, escalaMaxima: 5 }, { nota: 6, escalaMinima: 0, escalaMaxima: 10 }])).toBe(6.75);
  });

  it("is null without grades", () => {
    expect(mediaNormalizada([])).toBeNull();
  });
});
