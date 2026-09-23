import { z } from "zod";

// Payload contracts for /api/v1/cursos (RF004). Durations are minutes in the database
// but hours in the API contract (AGENTS.md conventions); the service converts both ways.

export const listCursosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createCursoBodySchema = z.object({
  codigo: z.string().trim().min(1).max(20),
  nome: z.string().trim().min(1).max(200),
  carga_minima_estagio_horas: z.number().int().min(1),
  carga_atividades_complementares_horas: z.number().int().min(0),
});
