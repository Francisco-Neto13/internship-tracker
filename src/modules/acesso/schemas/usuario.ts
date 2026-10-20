import { z } from "zod";
import { perfil } from "@/db/schema";

// Payload contracts for /api/v1/usuarios (RF001, RF003). JSON fields are snake_case;
// services receive camelCase. Business rules on the links (coordination needs a course,
// supervisor waits for Fase 2, duplicates) live in domain/vinculos.ts, not here.

const nome = z.string().trim().min(1).max(200);
// The auth library stores e-mails lowercased and looks them up by exact match
const email = z.email().trim().toLowerCase().max(254);

export const vinculoBodySchema = z.object({
  perfil: z.enum(perfil.enumValues),
  curso_id: z.uuid().nullish(),
});

const perfis = z.array(vinculoBodySchema).min(1).max(20);

export const listUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  perfil: z.enum(perfil.enumValues).optional(),
  situacao: z.enum(["ATIVO", "INATIVO"]).optional(),
  busca: z.string().trim().min(1).max(100).optional(),
});

export const createUsuarioBodySchema = z.object({ nome, email, perfis });

export const updateUsuarioBodySchema = z
  .object({ nome: nome.optional(), email: email.optional() })
  .refine((body) => body.nome !== undefined || body.email !== undefined, {
    message: "Informe ao menos um campo para alterar",
  });

export const replacePerfisBodySchema = z.object({ perfis });

export const idParamSchema = z.object({ id: z.uuid() });

export function toVinculos(body: z.infer<typeof perfis>) {
  return body.map((vinculo) => ({ perfil: vinculo.perfil, cursoId: vinculo.curso_id ?? null }));
}
