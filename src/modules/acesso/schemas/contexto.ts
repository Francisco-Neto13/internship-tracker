import { z } from "zod";
import { LIMITE } from "@/lib/campos";
import { perfil } from "@/db/schema";

// RF003: request shapes of /api/v1/contexto

export const iniciarContextoBodySchema = z.object({ usuario_id: z.uuid() }).strict();

export const contasContextoQuerySchema = z.object({
  busca: z.string().trim().max(LIMITE.busca).optional(),
  perfil: z.enum(perfil.enumValues).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
