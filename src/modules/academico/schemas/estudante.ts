import { z } from "zod";

// Payload contracts for /api/v1/estudantes (RF005). JSON fields are snake_case;
// services receive camelCase.

export const listEstudantesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  curso_id: z.uuid().optional(),
});

export const createEstudanteBodySchema = z.object({
  usuario_id: z.uuid(),
  curso_id: z.uuid(),
  matricula: z.string().trim().min(1).max(30),
  periodo: z.number().int().min(1).max(20),
});
