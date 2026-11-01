import { z } from "zod";
import { TIPOS_RELATORIO } from "../domain/relatorios-gerenciais";

// Contracts of /api/v1/relatorios-gerenciais (RF067, RF068). The period is two calendar days
// in America/Sao_Paulo, both inclusive; without `ate` the report is as of today.

export const tipoRelatorioParamSchema = z.object({ tipo: z.enum(TIPOS_RELATORIO) });

const filtros = z
  .object({
    curso_id: z.uuid().optional(),
    concedente_id: z.uuid().optional(),
    de: z.iso.date().optional(),
    ate: z.iso.date().optional(),
  })
  .refine((query) => !query.de || !query.ate || query.de <= query.ate, { path: ["ate"], message: "A data final precisa ser igual ou posterior à inicial" });

export const relatorioQuerySchema = filtros.transform((query) => ({
  cursoId: query.curso_id ?? null,
  concedenteId: query.concedente_id ?? null,
  de: query.de ?? null,
  ate: query.ate ?? null,
}));

export const exportacaoQuerySchema = z.intersection(filtros, z.object({ formato: z.enum(["csv", "pdf"]).default("csv") })).transform((query) => ({
  formato: query.formato,
  filtro: { cursoId: query.curso_id ?? null, concedenteId: query.concedente_id ?? null, de: query.de ?? null, ate: query.ate ?? null },
}));
