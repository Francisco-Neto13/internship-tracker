// RF051, RN-23 (DER §5.10): how many declared minutes of an activity count. Within what is
// left of the category limit in the course and of the course total; the rest is the excess
// the student is told about. The trigger app.validar_analise_atividade applies this rule at
// approval; here it previews the queue of the coordination (tested to agree).

export type SaldoAproveitamento = {
  declaradosMinutos: number;
  limiteCategoriaMinutos: number;
  jaAproveitadoNaCategoriaMinutos: number;
  totalCursoMinutos: number;
  jaAproveitadoNoTotalMinutos: number;
};

export type Aproveitamento = {
  aproveitadosMinutos: number;
  excedentesMinutos: number;
  /** Which bound cut the activity, when something was not counted. */
  limitadoPor: "CATEGORIA" | "TOTAL_DO_CURSO" | null;
};

export function calcularAproveitamento(saldo: SaldoAproveitamento): Aproveitamento {
  const cabeCategoria = Math.max(saldo.limiteCategoriaMinutos - saldo.jaAproveitadoNaCategoriaMinutos, 0);
  const cabeTotal = Math.max(saldo.totalCursoMinutos - saldo.jaAproveitadoNoTotalMinutos, 0);
  const aproveitadosMinutos = Math.min(saldo.declaradosMinutos, cabeCategoria, cabeTotal);
  const excedentesMinutos = saldo.declaradosMinutos - aproveitadosMinutos;
  return {
    aproveitadosMinutos,
    excedentesMinutos,
    limitadoPor: excedentesMinutos === 0 ? null : cabeCategoria <= cabeTotal ? "CATEGORIA" : "TOTAL_DO_CURSO",
  };
}

/** The activity was done: it ends today at the latest, and does not end before it starts. */
export function periodoValido(dataInicio: string, dataFim: string, hoje: string): "OK" | "PERIODO_INVALIDO" | "ATIVIDADE_FUTURA" {
  if (dataFim < dataInicio) return "PERIODO_INVALIDO";
  if (dataFim > hoje) return "ATIVIDADE_FUTURA";
  return "OK";
}
