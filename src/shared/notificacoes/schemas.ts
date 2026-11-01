import { z } from "zod";

// Contracts of /api/v1/notificacoes (RF070)
export const notificacoesQuerySchema = z
  .object({ nao_lidas: z.enum(["true", "false"]).optional(), limite: z.coerce.number().int().min(1).max(200).default(50) })
  .transform((query) => ({ apenasNaoLidas: query.nao_lidas === "true", limite: query.limite }));

export const notificacaoIdParamSchema = z.object({ id: z.uuid() });
