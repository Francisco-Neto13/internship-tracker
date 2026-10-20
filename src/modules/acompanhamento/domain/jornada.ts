// RF023 to RF025, RN-07 (DER-LOGICO §5.3, D2, D4): the duration of a day and the limits it
// must respect. Pure functions over integer minutes, so the same input always gives the
// same answer; the trigger app.validar_registro_frequencia applies the same rule as the
// barrier.

const HORARIO = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutosDoHorario(horario: string): number {
  const partes = HORARIO.exec(horario);
  if (!partes) throw new Error(`Horário inválido: ${horario}`);
  return Number(partes[1]) * 60 + Number(partes[2]);
}

export type HorarioDoDia = { horaEntrada: string; horaSaida: string; intervaloMinutos: number };

export type ProblemaHorario = "SAIDA_ANTES_DA_ENTRADA" | "INTERVALO_MAIOR_QUE_JORNADA";

/** D2: entry and exit of the day minus the break (split shift); no shift crosses midnight. */
export function duracaoDoHorario({ horaEntrada, horaSaida, intervaloMinutos }: HorarioDoDia): { minutos: number } | { problema: ProblemaHorario } {
  const bruto = minutosDoHorario(horaSaida) - minutosDoHorario(horaEntrada);
  if (bruto <= 0) return { problema: "SAIDA_ANTES_DA_ENTRADA" };
  if (intervaloMinutos >= bruto) return { problema: "INTERVALO_MAIOR_QUE_JORNADA" };
  return { minutos: bruto - intervaloMinutos };
}

/** D4: ISO 8601 week of a date, Monday to Sunday, as calendar dates (YYYY-MM-DD). */
export function semanaIso(data: string): { inicio: string; fim: string } {
  const dia = new Date(`${data}T00:00:00Z`);
  const desdeSegunda = (dia.getUTCDay() + 6) % 7;
  const inicio = new Date(dia);
  inicio.setUTCDate(dia.getUTCDate() - desdeSegunda);
  const fim = new Date(inicio);
  fim.setUTCDate(inicio.getUTCDate() + 6);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export type Limites = { limiteDiarioMinutos: number; limiteSemanalMinutos: number; bloquearExcedente: boolean };

export type AvaliacaoJornada = {
  excedeuDiario: boolean;
  excedeuSemanal: boolean;
  totalSemanaMinutos: number;
  /** RF025: over a limit and the institution blocks, the entry is refused. */
  bloqueia: boolean;
  /** RF025: over a limit and the institution only flags, the entry is SINALIZADO. */
  situacao: "REGISTRADO" | "SINALIZADO";
};

/**
 * RF024, RF025: checks a day against the daily limit of the internship type and the weekly
 * limit, summing the other entries in force of the same ISO week.
 */
export function avaliarJornada(duracaoMinutos: number, outrasDaSemanaMinutos: number, limites: Limites): AvaliacaoJornada {
  const totalSemanaMinutos = outrasDaSemanaMinutos + duracaoMinutos;
  const excedeuDiario = duracaoMinutos > limites.limiteDiarioMinutos;
  const excedeuSemanal = totalSemanaMinutos > limites.limiteSemanalMinutos;
  const excedeu = excedeuDiario || excedeuSemanal;
  return {
    excedeuDiario,
    excedeuSemanal,
    totalSemanaMinutos,
    bloqueia: excedeu && limites.bloquearExcedente,
    situacao: excedeu ? "SINALIZADO" : "REGISTRADO",
  };
}
