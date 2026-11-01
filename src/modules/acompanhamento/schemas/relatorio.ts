import { z } from "zod";

// Contracts of the report routes (RF037 to RF041)

export const envioRelatorioBodySchema = z
  .object({
    conteudo: z.string().trim().max(50_000).nullish(),
    documento_ids: z.array(z.uuid()).max(10).default([]),
  })
  .transform((body) => ({ conteudo: body.conteudo || null, documentoIds: body.documento_ids }));

export const aprovacaoRelatorioBodySchema = z.object({ parecer: z.string().trim().max(10_000).nullish() });

export const devolucaoRelatorioBodySchema = z.object({ parecer: z.string().trim().min(1).max(10_000) });
