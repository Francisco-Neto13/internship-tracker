import { z } from "zod";
import { horasParaMinutos, horasSchema } from "@/lib/horas";

// Contracts of /api/v1/parametros (RF006), /categorias-atividade (RF048) and
// /cursos/{id}/exigencias (RF004). Hours in the API, minutes in the services.

export const dataQuerySchema = z.object({ data: z.iso.date().optional() });

export const definirParametrosBodySchema = z.object({
  vigencia_inicio: z.iso.date(),
  limite_horas_diarias_obrigatorio: horasSchema({ min: 1 / 60, max: 24 }),
  limite_horas_diarias_nao_obrigatorio: horasSchema({ min: 1 / 60, max: 24 }),
  limite_horas_semanais: horasSchema({ min: 1 / 60, max: 168 }),
  bloquear_excedente: z.boolean(),
  duracao_maxima_meses: z.number().int().min(1).max(24),
  tolerancia_divergencia_percentual: z.number().min(0).max(100),
  prazo_guarda_anos: z.number().int().min(1).max(100),
  antecedencia_alerta_convenio_dias: z.number().int().min(1).max(365),
});

export function toParametros(body: z.infer<typeof definirParametrosBodySchema>) {
  return {
    vigenciaInicio: body.vigencia_inicio,
    limiteDiarioObrigatorioMinutos: horasParaMinutos(body.limite_horas_diarias_obrigatorio),
    limiteDiarioNaoObrigatorioMinutos: horasParaMinutos(body.limite_horas_diarias_nao_obrigatorio),
    limiteSemanalMinutos: horasParaMinutos(body.limite_horas_semanais),
    bloquearExcedente: body.bloquear_excedente,
    duracaoMaximaMeses: body.duracao_maxima_meses,
    toleranciaDivergenciaPercentual: body.tolerancia_divergencia_percentual,
    prazoGuardaAnos: body.prazo_guarda_anos,
    antecedenciaAlertaConvenioDias: body.antecedencia_alerta_convenio_dias,
  };
}

const nomeCategoria = z.string().trim().min(1).max(100);

export const listCategoriasQuerySchema = z.object({
  incluir_inativas: z.enum(["true", "false"]).default("false").transform((valor) => valor === "true"),
});

export const createCategoriaBodySchema = z.object({
  nome: nomeCategoria,
  descricao: z.string().trim().max(500).nullish(),
});

export const updateCategoriaBodySchema = z
  .object({ nome: nomeCategoria.optional(), descricao: z.string().trim().max(500).nullish(), ativa: z.boolean().optional() })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), { message: "Informe ao menos um campo para alterar" });

export const definirExigenciasBodySchema = z.object({
  exigencias: z
    .array(
      z.object({
        categoria_id: z.uuid(),
        limite_horas: horasSchema({ min: 1 / 60, max: 10_000 }),
        admite_estagio_nao_obrigatorio: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(50)
    .refine((itens) => new Set(itens.map((item) => item.categoria_id)).size === itens.length, {
      message: "Cada categoria aparece uma vez",
    }),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
