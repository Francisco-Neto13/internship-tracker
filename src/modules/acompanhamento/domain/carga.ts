// RF026, RF028, RN-08, RN-09 (DER-LOGICO §5.3): accumulated hours and the divergence from
// the hours expected so far. The single place where these numbers are calculated: integer
// minutes, whole days and a percentage compared in hundredths, so the result never depends
// on floating point or on who asks.

export type EstagioCarga = {
  dataInicio: string;
  dataFimPrevista: string;
  cargaSemanalMinutos: number;
  cargaTotalMinutos: number;
};

const umDia = 24 * 60 * 60 * 1000;
const paraDia = (data: string) => Date.parse(`${data}T00:00:00Z`) / umDia;

export function diaAnterior(data: string): string {
  return new Date((paraDia(data) - 1) * umDia).toISOString().slice(0, 10);
}

/** Business days (Monday to Friday) from `inicio` to `fim`, both included; 0 if fim < inicio. */
export function diasUteis(inicio: string, fim: string): number {
  const primeiro = paraDia(inicio);
  const ultimo = paraDia(fim);
  if (ultimo < primeiro) return 0;
  const total = ultimo - primeiro + 1;
  const semanasInteiras = Math.floor(total / 7);
  let uteis = semanasInteiras * 5;
  // 1970-01-01 (day 0) was a Thursday: (day + 3) % 7 gives 0 for Monday
  for (let dia = primeiro + semanasInteiras * 7; dia <= ultimo; dia++) {
    if ((dia + 3) % 7 < 5) uteis++;
  }
  return uteis;
}

/**
 * Hours expected until `dataReferencia`: the weekly workload of the TCE spread over the
 * business days elapsed since the start (5 a week), never above the total workload. Days
 * after the planned end do not add.
 */
export function minutosPrevistosAte(estagio: EstagioCarga, dataReferencia: string): number {
  const fim = dataReferencia < estagio.dataFimPrevista ? dataReferencia : estagio.dataFimPrevista;
  const previstos = Math.floor((estagio.cargaSemanalMinutos * diasUteis(estagio.dataInicio, fim)) / 5);
  return Math.min(previstos, estagio.cargaTotalMinutos);
}

export type Divergencia = {
  dataReferencia: string;
  minutosPrevistos: number;
  minutosCumpridos: number;
  /** |cumpridos - previstos| / previstos, in percent with two decimals; null when nothing is expected yet. */
  percentual: number | null;
  toleranciaPercentual: number;
  /** Evaluated only after a full week of expected work, so the first days do not raise noise. */
  avaliada: boolean;
  divergente: boolean;
};

/**
 * RF028, RN-09: relevant when |cumpridos - previstos| exceeds the tolerance (default 10%) of
 * what was expected. Reference is the day before today: the hours of today may still be
 * registered. Compared in integers: |c - p| * 10000 > tolerance in hundredths * p.
 */
export function avaliarDivergencia(
  estagio: EstagioCarga,
  minutosCumpridos: number,
  toleranciaPercentual: number,
  hoje: string,
): Divergencia {
  const dataReferencia = diaAnterior(hoje);
  const minutosPrevistos = minutosPrevistosAte(estagio, dataReferencia);
  const avaliada = minutosPrevistos >= estagio.cargaSemanalMinutos && minutosPrevistos > 0;
  const diferenca = Math.abs(minutosCumpridos - minutosPrevistos);
  const toleranciaCentesimos = Math.round(toleranciaPercentual * 100);
  return {
    dataReferencia,
    minutosPrevistos,
    minutosCumpridos,
    percentual: minutosPrevistos > 0 ? Math.round((diferenca * 10000) / minutosPrevistos) / 100 : null,
    toleranciaPercentual,
    avaliada,
    divergente: avaliada && diferenca * 10000 > toleranciaCentesimos * minutosPrevistos,
  };
}

export type TotaisFrequencia = {
  /** Entries in force (REGISTRADO, SINALIZADO, HOMOLOGADO). */
  minutosCumpridos: number;
  minutosHomologados: number;
  /** Entries in force still waiting for the supervisor (REGISTRADO, SINALIZADO). */
  minutosPendentes: number;
  lancamentosSinalizados: number;
};

/**
 * RF026: only homologated minutes count toward the workload (requisitos v1.2 §7.4); balance
 * and completion percentage are against the total workload of the TCE in force.
 */
export function resumoCarga(estagio: EstagioCarga, totais: TotaisFrequencia) {
  const saldo = Math.max(estagio.cargaTotalMinutos - totais.minutosHomologados, 0);
  const percentual = Math.min(Math.floor((totais.minutosHomologados * 10000) / estagio.cargaTotalMinutos) / 100, 100);
  return { ...totais, cargaTotalMinutos: estagio.cargaTotalMinutos, saldoMinutos: saldo, percentualConclusao: percentual };
}
