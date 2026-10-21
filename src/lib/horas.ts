import { z } from "zod";

// AGENTS.md: durations are integer minutes in the database and hours in the API. A value in
// hours is accepted only when it is a whole number of minutes (6.5 h = 390 min; 6.01 h is not).

const EPSILON = 1e-9;

export function horasParaMinutos(horas: number): number {
  return Math.round(horas * 60);
}

export function minutosParaHoras(minutos: number): number {
  return minutos / 60;
}

/** Zod schema for a duration in hours that converts to whole minutes, within [min, max] hours. */
export function horasSchema(limites: { min?: number; max?: number } = {}) {
  return z
    .number()
    .min(limites.min ?? 0)
    .max(limites.max ?? Number.MAX_SAFE_INTEGER / 60)
    .refine((horas) => Math.abs(horas * 60 - Math.round(horas * 60)) < EPSILON, {
      message: "Informe a duração em horas com minutos inteiros (ex.: 6.5 = 6h30)",
    });
}
