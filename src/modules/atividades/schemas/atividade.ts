import { dataSchema } from "@/lib/campos";
import { LIMITE } from "@/lib/campos";
import { z } from "zod";
import { horasParaMinutos, horasSchema } from "@/lib/horas";

// Contracts of /api/v1/atividades-complementares (RF046 to RF055). Hours in the API, minutes
// in the services (AGENTS.md).

const texto = (max: number) => z.string().trim().min(1).max(max);

export const idParamSchema = z.object({ id: z.uuid() });

const campos = {
  categoria_id: z.uuid(),
  descricao: texto(LIMITE.descricaoAtividade),
  instituicao_promotora: texto(LIMITE.instituicao),
  data_inicio: dataSchema,
  data_fim: dataSchema,
  horas_declaradas: horasSchema({ min: 1 / 60, max: 10_000 }),
};

export const cadastroAtividadeBodySchema = z
  .object({
    ...campos,
    documento_ids: z.array(z.uuid()).min(1, "Anexe ao menos um comprovante").max(10),
    origem_estagio_id: z.uuid().nullish(),
  })
  .transform((body) => ({
    categoriaId: body.categoria_id,
    descricao: body.descricao,
    instituicaoPromotora: body.instituicao_promotora,
    dataInicio: body.data_inicio,
    dataFim: body.data_fim,
    horasDeclaradasMinutos: horasParaMinutos(body.horas_declaradas),
    documentoIds: body.documento_ids,
    origemEstagioId: body.origem_estagio_id ?? null,
  }));

export const complementacaoBodySchema = z
  .object({
    categoria_id: campos.categoria_id.optional(),
    descricao: campos.descricao.optional(),
    instituicao_promotora: campos.instituicao_promotora.optional(),
    data_inicio: campos.data_inicio.optional(),
    data_fim: campos.data_fim.optional(),
    horas_declaradas: campos.horas_declaradas.optional(),
    adicionar_documento_ids: z.array(z.uuid()).max(10).default([]),
    retirar_comprovante_ids: z.array(z.uuid()).max(10).default([]),
  })
  .transform((body) => ({
    dados: {
      categoriaId: body.categoria_id,
      descricao: body.descricao,
      instituicaoPromotora: body.instituicao_promotora,
      dataInicio: body.data_inicio,
      dataFim: body.data_fim,
      horasDeclaradasMinutos: body.horas_declaradas === undefined ? undefined : horasParaMinutos(body.horas_declaradas),
    },
    adicionarDocumentoIds: body.adicionar_documento_ids,
    retirarComprovanteIds: body.retirar_comprovante_ids,
  }));

export const motivoBodySchema = z.object({ motivo: texto(LIMITE.motivoAtividade) });

export const atividadesQuerySchema = z
  .object({
    estudante_id: z.uuid().optional(),
    categoria_id: z.uuid().optional(),
    situacao: z.enum(["EM_ANALISE", "DEVOLVIDA", "APROVADA", "RECUSADA"]).optional(),
  })
  .transform((query) => ({ estudanteId: query.estudante_id, categoriaId: query.categoria_id, situacao: query.situacao }));
