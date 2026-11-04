import { dataSchema } from "@/lib/campos";
import { LIMITE } from "@/lib/campos";
import { z } from "zod";

// Contracts of /api/v1/convenios and /concedentes/{id}/convenios (RF009 to RF012)

const periodo = {
  vigencia_inicio: dataSchema,
  vigencia_fim: dataSchema,
  documento_id: z.uuid(),
};

export const createConvenioBodySchema = z.object({
  numero: z.string().trim().min(1).max(LIMITE.numeroConvenio),
  observacao: z.string().trim().max(2000).nullish(),
  ...periodo,
});

export const renovarConvenioBodySchema = z.object(periodo);

export const updateConvenioBodySchema = z.object({ observacao: z.string().trim().max(2000).nullable() });

export const encerrarConvenioBodySchema = z.object({ motivo: z.string().trim().min(1).max(1000) });

export const aVencerQuerySchema = z.object({ dias: z.coerce.number().int().min(1).max(365).optional() });
