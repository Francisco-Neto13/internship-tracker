// RF006: institutional policies. Until the administrator records a version, the legal
// defaults apply, so no fictitious author has to be seeded:
// - Lei 11.788/2008, art. 10, II: 6 hours a day and 30 hours a week in higher education;
// - art. 11: at most 2 years at the same concedente;
// - divergence tolerance of 10% (decision of 2026-09-08), 5-year document retention and a
//   60-day convênio alert (DER-LOGICO §4.2).

export type Parametros = {
  vigenciaInicio: string | null;
  limiteDiarioObrigatorioMinutos: number;
  limiteDiarioNaoObrigatorioMinutos: number;
  limiteSemanalMinutos: number;
  bloquearExcedente: boolean;
  duracaoMaximaMeses: number;
  toleranciaDivergenciaPercentual: number;
  prazoGuardaAnos: number;
  antecedenciaAlertaConvenioDias: number;
};

export const PARAMETROS_PADRAO: Parametros = {
  vigenciaInicio: null,
  limiteDiarioObrigatorioMinutos: 6 * 60,
  limiteDiarioNaoObrigatorioMinutos: 6 * 60,
  limiteSemanalMinutos: 30 * 60,
  bloquearExcedente: true,
  duracaoMaximaMeses: 24,
  toleranciaDivergenciaPercentual: 10,
  prazoGuardaAnos: 5,
  antecedenciaAlertaConvenioDias: 60,
};

/** ISO date (YYYY-MM-DD) of `data` in the institution's time zone. */
export function dataLocal(data: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}
