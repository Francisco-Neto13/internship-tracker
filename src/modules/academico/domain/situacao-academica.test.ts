import { describe, expect, it } from "vitest";
import {
  type SituacaoAcademica,
  TRANSICOES_SITUACAO_ACADEMICA,
  transicaoPermitida,
  validarTransicaoSituacaoAcademica,
} from "./situacao-academica";

const TODAS: SituacaoAcademica[] = ["MATRICULADO", "TRANCADO", "FORMADO", "DESLIGADO"];

describe("academic situation transitions (RF005, Lei 11.788/2008 art. 3º, I)", () => {
  it("allows exactly the listed transitions and keeping the same situation", () => {
    const permitidas = TODAS.flatMap((de) => TODAS.filter((para) => de !== para && transicaoPermitida(de, para)).map((para) => `${de}>${para}`));

    expect(permitidas.sort()).toEqual(
      ["MATRICULADO>TRANCADO", "MATRICULADO>FORMADO", "MATRICULADO>DESLIGADO", "TRANCADO>MATRICULADO", "TRANCADO>DESLIGADO"].sort(),
    );
    for (const situacao of TODAS) expect(transicaoPermitida(situacao, situacao)).toBe(true);
  });

  it("treats FORMADO and DESLIGADO as final", () => {
    expect(TRANSICOES_SITUACAO_ACADEMICA.FORMADO).toEqual([]);
    expect(TRANSICOES_SITUACAO_ACADEMICA.DESLIGADO).toEqual([]);
    expect(() => validarTransicaoSituacaoAcademica("FORMADO", "MATRICULADO")).toThrow(
      expect.objectContaining({ code: "TRANSICAO_SITUACAO_INVALIDA", kind: "CONFLICT", message: expect.stringContaining("final") }),
    );
  });

  it("does not let a locked enrolment graduate directly", () => {
    expect(() => validarTransicaoSituacaoAcademica("TRANCADO", "FORMADO")).toThrow(
      expect.objectContaining({ message: "A situação TRANCADO só pode passar para MATRICULADO ou DESLIGADO." }),
    );
  });
});
