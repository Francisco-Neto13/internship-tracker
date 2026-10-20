import { z } from "zod";
import { situacaoAcademica } from "@/db/schema";

// Payload contracts for /api/v1/estudantes (RF005). JSON fields are snake_case;
// services receive camelCase.

const matricula = z.string().trim().min(1).max(30);
const periodo = z.number().int().min(1).max(20);

export const listEstudantesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  curso_id: z.uuid().optional(),
  situacao: z.enum(situacaoAcademica.enumValues).optional(),
  busca: z.string().trim().min(1).max(100).optional(),
});

export const createEstudanteBodySchema = z.object({
  usuario_id: z.uuid(),
  curso_id: z.uuid(),
  matricula,
  periodo,
});

// The account (usuario_id) is fixed: a different person is a different student record
export const updateEstudanteBodySchema = z
  .object({
    curso_id: z.uuid().optional(),
    matricula: matricula.optional(),
    periodo: periodo.optional(),
    situacao_academica: z.enum(situacaoAcademica.enumValues).optional(),
  })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), {
    message: "Informe ao menos um campo para alterar",
  });

export const estudanteIdParamSchema = z.object({ id: z.uuid() });

export function toEstudanteValues(body: z.infer<typeof updateEstudanteBodySchema>) {
  return {
    cursoId: body.curso_id,
    matricula: body.matricula,
    periodo: body.periodo,
    situacaoAcademica: body.situacao_academica,
  };
}
