import { DomainError } from "@/lib/errors";

// RF005: transitions of the academic situation. Lei 11.788/2008, art. 3º, I makes "matrícula
// e frequência regular" a condition of every internship, so the situation feeds the estágio
// rules of Fase 2 and cannot change freely. The most restrictive reading is adopted:
// FORMADO and DESLIGADO are final, and a locked enrolment (TRANCADO) cannot graduate
// without returning to MATRICULADO first. Pending validation with the advisor; the same
// table is enforced by the trigger in drizzle/sql/functions/04_situacao_academica.sql.

export type SituacaoAcademica = "MATRICULADO" | "TRANCADO" | "FORMADO" | "DESLIGADO";

export const SITUACAO_ACADEMICA_INICIAL: SituacaoAcademica = "MATRICULADO";

export const TRANSICOES_SITUACAO_ACADEMICA: Readonly<Record<SituacaoAcademica, readonly SituacaoAcademica[]>> = {
  MATRICULADO: ["TRANCADO", "FORMADO", "DESLIGADO"],
  TRANCADO: ["MATRICULADO", "DESLIGADO"],
  FORMADO: [],
  DESLIGADO: [],
};

export function transicaoPermitida(de: SituacaoAcademica, para: SituacaoAcademica): boolean {
  return de === para || TRANSICOES_SITUACAO_ACADEMICA[de].includes(para);
}

export function validarTransicaoSituacaoAcademica(de: SituacaoAcademica, para: SituacaoAcademica): void {
  if (transicaoPermitida(de, para)) return;
  const destinos = TRANSICOES_SITUACAO_ACADEMICA[de];
  throw new DomainError({
    code: "TRANSICAO_SITUACAO_INVALIDA",
    kind: "CONFLICT",
    message:
      destinos.length === 0
        ? `A situação ${de} é final e não pode ser alterada.`
        : `A situação ${de} só pode passar para ${destinos.join(" ou ")}.`,
    requisito: "RF005",
  });
}
