import { z } from "zod";
import { horasParaMinutos, horasSchema } from "@/lib/horas";
import type { DiaInformado } from "../services/frequencia-service";

// Contracts of the M05 frequency routes (RF023 to RF030). Hours in the API, minutes in the
// services (AGENTS.md); times as HH:MM, dates as YYYY-MM-DD.

const horario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const texto = (max: number) => z.string().trim().min(1).max(max);

export const idParamSchema = z.object({ id: z.uuid() });

/** D2: entry and exit (with the break of a split shift) or the total of the day, never both. */
const diaSchema = z
  .object({
    hora_entrada: horario.optional(),
    hora_saida: horario.optional(),
    intervalo_horas: horasSchema({ min: 0, max: 24 }).optional(),
    horas: horasSchema({ min: 1 / 60, max: 24 }).optional(),
    observacao: texto(1000).nullish(),
  })
  .refine((dia) => (dia.hora_entrada === undefined) === (dia.hora_saida === undefined), {
    message: "Informe entrada e saída juntas",
    path: ["hora_saida"],
  })
  .refine((dia) => (dia.hora_entrada !== undefined) !== (dia.horas !== undefined), {
    message: "Informe entrada e saída ou o total de horas do dia",
    path: ["horas"],
  })
  .refine((dia) => dia.hora_entrada !== undefined || dia.intervalo_horas === undefined, {
    message: "O intervalo só vale com entrada e saída",
    path: ["intervalo_horas"],
  });

type Dia = z.infer<typeof diaSchema>;

function paraDia(body: Dia): Omit<DiaInformado, "data"> {
  return {
    horario:
      body.hora_entrada && body.hora_saida
        ? { horaEntrada: body.hora_entrada, horaSaida: body.hora_saida, intervaloMinutos: horasParaMinutos(body.intervalo_horas ?? 0) }
        : undefined,
    duracaoMinutos: body.horas === undefined ? undefined : horasParaMinutos(body.horas),
    observacao: body.observacao ?? null,
  };
}

export const frequenciaBodySchema = diaSchema.and(z.object({ data: z.iso.date() })).transform((body) => ({ ...paraDia(body), data: body.data }));

export const ajusteBodySchema = diaSchema
  .and(z.object({ justificativa: texto(1000) }))
  .transform((body) => ({ ...paraDia(body), justificativa: body.justificativa }));

export const cancelamentoBodySchema = z.object({ justificativa: texto(1000) });

export const frequenciasQuerySchema = z
  .object({
    data_inicio: z.iso.date().optional(),
    data_fim: z.iso.date().optional(),
    situacao: z.enum(["REGISTRADO", "SINALIZADO", "HOMOLOGADO", "SUBSTITUIDO", "CANCELADO"]).optional(),
  })
  .transform((query) => ({ dataInicio: query.data_inicio, dataFim: query.data_fim, situacao: query.situacao }));

export const homologacaoBodySchema = z
  .object({ periodo_inicio: z.iso.date(), periodo_fim: z.iso.date(), observacao: texto(2000).nullish() })
  .transform((body) => ({ periodoInicio: body.periodo_inicio, periodoFim: body.periodo_fim, observacao: body.observacao ?? null }));

export const analiseDivergenciaBodySchema = z.object({ parecer: texto(4000) });
