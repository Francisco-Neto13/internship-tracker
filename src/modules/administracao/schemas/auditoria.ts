import { z } from "zod";

// Query contract of GET /api/v1/auditoria and /auditoria/exportacao (RF066). Dates are
// calendar days in the institution's time zone, both ends inclusive.

const filtros = z
  .object({
    tabela: z.string().trim().min(1).max(63).optional(),
    registro_id: z.string().trim().min(1).max(100).optional(),
    usuario_id: z.uuid().optional(),
    operacao: z.enum(["INSERT", "UPDATE", "DELETE", "LEITURA"]).optional(),
    de: z.iso.date().optional(),
    ate: z.iso.date().optional(),
  })
  .refine((query) => !query.de || !query.ate || query.de <= query.ate, {
    path: ["ate"],
    message: "A data final precisa ser igual ou posterior à inicial",
  });

export const listAuditoriaQuerySchema = z.intersection(
  filtros,
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
);

export const exportAuditoriaQuerySchema = filtros;

export type FiltroAuditoriaQuery = z.infer<typeof filtros>;

export function toFiltroAuditoria(query: FiltroAuditoriaQuery) {
  return {
    tabela: query.tabela,
    registroId: query.registro_id,
    usuarioId: query.usuario_id,
    operacao: query.operacao,
    de: query.de,
    ate: query.ate,
  };
}
