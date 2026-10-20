import { z } from "zod";

// Payload contracts for /api/v1/cursos (RF004). Durations are minutes in the database
// but hours in the API contract (AGENTS.md conventions); the service converts both ways.

export const listCursosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const codigo = z.string().trim().min(1).max(20);
const nome = z.string().trim().min(1).max(200);
const cargaMinimaEstagio = z.number().int().min(1);
const cargaComplementares = z.number().int().min(0);

export const createCursoBodySchema = z.object({
  codigo,
  nome,
  carga_minima_estagio_horas: cargaMinimaEstagio,
  carga_atividades_complementares_horas: cargaComplementares,
});

export const updateCursoBodySchema = z
  .object({
    codigo: codigo.optional(),
    nome: nome.optional(),
    carga_minima_estagio_horas: cargaMinimaEstagio.optional(),
    carga_atividades_complementares_horas: cargaComplementares.optional(),
  })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), {
    message: "Informe ao menos um campo para alterar",
  });

export const cursoIdParamSchema = z.object({ id: z.uuid() });

const horasParaMinutos = (horas: number | undefined) => (horas === undefined ? undefined : horas * 60);

export function toCursoValues(body: z.infer<typeof updateCursoBodySchema>) {
  return {
    codigo: body.codigo,
    nome: body.nome,
    cargaMinimaEstagioMinutos: horasParaMinutos(body.carga_minima_estagio_horas),
    cargaAtividadesComplementaresMinutos: horasParaMinutos(body.carga_atividades_complementares_horas),
  };
}
