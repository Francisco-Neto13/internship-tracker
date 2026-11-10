import { dataSchema } from "@/lib/campos";
import { LIMITE } from "@/lib/campos";
import { z } from "zod";
import { codigoDoCriterio } from "../domain/avaliacao";

// Contracts of evaluation (RF042, RF043), criteria (RF042) and follow-up (RF033)

const texto = (max: number) => z.string().trim().min(1).max(max);

export const criterioBodySchema = z
  .object({
    // Optional: the screen sends only the description, and the code comes from it
    codigo: z.string().trim().min(1).max(40).regex(/^[A-Z0-9_]+$/, "Use letras maiúsculas, números e _").optional(),
    descricao: texto(LIMITE.descricaoCriterio),
    escala_minima: z.number().int().min(0).max(99),
    escala_maxima: z.number().int().min(1).max(100),
    ordem: z.number().int().min(0).max(999).default(0),
  })
  .transform((body) => ({ codigo: body.codigo ?? codigoDoCriterio(body.descricao), descricao: body.descricao, escalaMinima: body.escala_minima, escalaMaxima: body.escala_maxima, ordem: body.ordem }));

export const alterarCriterioBodySchema = z
  .object({
    descricao: texto(LIMITE.descricaoCriterio).optional(),
    escala_minima: z.number().int().min(0).max(99).optional(),
    escala_maxima: z.number().int().min(1).max(100).optional(),
    ordem: z.number().int().min(0).max(999).optional(),
    ativo: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), { message: "Informe ao menos um campo para alterar" })
  .transform((body) => ({ descricao: body.descricao, escalaMinima: body.escala_minima, escalaMaxima: body.escala_maxima, ordem: body.ordem, ativo: body.ativo }));

export const criteriosQuerySchema = z
  .object({ incluir_inativos: z.enum(["true", "false"]).optional() })
  .transform((query) => ({ apenasAtivos: query.incluir_inativos !== "true" }));

export const avaliacaoBodySchema = z
  .object({
    momento: z.enum(["PERIODICA", "FINAL"]),
    periodo_inicio: dataSchema.nullish(),
    periodo_fim: dataSchema.nullish(),
    observacoes: texto(LIMITE.observacoesAvaliacao).nullish(),
    respostas: z
      .array(z.object({ criterio_id: z.uuid(), nota: z.number("Dê uma nota a este critério").int(), comentario: texto(LIMITE.comentarioAvaliacao).nullish() }))
      .min(1)
      .max(50),
  })
  .transform((body) => ({
    momento: body.momento,
    periodoInicio: body.periodo_inicio ?? null,
    periodoFim: body.periodo_fim ?? null,
    observacoes: body.observacoes ?? null,
    respostas: body.respostas.map((resposta) => ({ criterioId: resposta.criterio_id, nota: resposta.nota, comentario: resposta.comentario ?? null })),
  }));

const tipoAcompanhamento = z.enum(["VISITA", "CONTATO", "REUNIAO"]);

export const acompanhamentoBodySchema = z
  .object({ tipo: tipoAcompanhamento, data_ocorrencia: dataSchema, participantes: texto(LIMITE.participantes), observacoes: texto(LIMITE.observacoesAcompanhamento) })
  .transform((body) => ({ tipo: body.tipo, dataOcorrencia: body.data_ocorrencia, participantes: body.participantes, observacoes: body.observacoes }));

export const alterarAcompanhamentoBodySchema = z
  .object({
    tipo: tipoAcompanhamento.optional(),
    data_ocorrencia: dataSchema.optional(),
    participantes: texto(LIMITE.participantes).optional(),
    observacoes: texto(LIMITE.observacoesAcompanhamento).optional(),
  })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), { message: "Informe ao menos um campo para alterar" })
  .transform((body) => ({ tipo: body.tipo, dataOcorrencia: body.data_ocorrencia, participantes: body.participantes, observacoes: body.observacoes }));
