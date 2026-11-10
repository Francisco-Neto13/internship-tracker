import { dataSchema } from "@/lib/campos";
import { LIMITE } from "@/lib/campos";
import { z } from "zod";
import { horasParaMinutos, horasSchema } from "@/lib/horas";

// Contracts of /api/v1/estagios and /api/v1/aditivos (RF015 to RF021, RF031, RF034, RF044).
// Hours in the API, minutes in the services; money as a number with two decimals.

const valor = z.number().min(0).max(1_000_000).multipleOf(0.01).nullish().transform((v) => (v === undefined || v === null ? null : v.toFixed(2)));

const camposTce = {
  concedente_id: z.uuid(),
  convenio_id: z.uuid(),
  tipo: z.enum(["OBRIGATORIO", "NAO_OBRIGATORIO"]),
  data_inicio: dataSchema,
  data_fim_pactuada: dataSchema,
  carga_horas_diaria: horasSchema({ min: 1 / 60, max: 24 }),
  carga_horas_semanal: horasSchema({ min: 1 / 60, max: 168 }),
  carga_horas_total: horasSchema({ min: 1 / 60, max: 100_000 }),
  condicoes_pactuadas: z.string().trim().min(1).max(LIMITE.condicoes),
  bolsa_valor: valor,
  auxilio_transporte_valor: valor,
  seguro_exigido: z.boolean().default(true),
};

export const createEstagioBodySchema = z.object({ estudante_id: z.uuid(), ...camposTce });

export const updateTceBodySchema = z
  .object({
    concedente_id: camposTce.concedente_id.optional(),
    convenio_id: camposTce.convenio_id.optional(),
    tipo: camposTce.tipo.optional(),
    data_inicio: camposTce.data_inicio.optional(),
    data_fim_pactuada: camposTce.data_fim_pactuada.optional(),
    carga_horas_diaria: camposTce.carga_horas_diaria.optional(),
    carga_horas_semanal: camposTce.carga_horas_semanal.optional(),
    carga_horas_total: camposTce.carga_horas_total.optional(),
    condicoes_pactuadas: camposTce.condicoes_pactuadas.optional(),
    bolsa_valor: z.number().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
    auxilio_transporte_valor: z.number().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
    seguro_exigido: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), { message: "Informe ao menos um campo para alterar" });

const minutos = (horas: number | undefined) => (horas === undefined ? undefined : horasParaMinutos(horas));
const dinheiro = (v: number | null | undefined) => (v === undefined ? undefined : v === null ? null : v.toFixed(2));

export function toDadosTce(body: z.infer<typeof updateTceBodySchema>) {
  const valores = {
    concedenteId: body.concedente_id,
    convenioId: body.convenio_id,
    tipo: body.tipo,
    dataInicio: body.data_inicio,
    dataFimPactuada: body.data_fim_pactuada,
    cargaDiariaMinutos: minutos(body.carga_horas_diaria),
    cargaSemanalMinutos: minutos(body.carga_horas_semanal),
    cargaTotalMinutos: minutos(body.carga_horas_total),
    condicoesPactuadas: body.condicoes_pactuadas,
    bolsaValor: dinheiro(body.bolsa_valor),
    auxilioTransporteValor: dinheiro(body.auxilio_transporte_valor),
    seguroExigido: body.seguro_exigido,
  };
  return Object.fromEntries(Object.entries(valores).filter(([, v]) => v !== undefined)) as {
    [K in keyof typeof valores]?: Exclude<(typeof valores)[K], undefined>;
  };
}

export function toNovoEstagio(body: z.infer<typeof createEstagioBodySchema>) {
  return {
    estudanteId: body.estudante_id,
    concedenteId: body.concedente_id,
    convenioId: body.convenio_id,
    tipo: body.tipo,
    dataInicio: body.data_inicio,
    dataFimPactuada: body.data_fim_pactuada,
    cargaDiariaMinutos: horasParaMinutos(body.carga_horas_diaria),
    cargaSemanalMinutos: horasParaMinutos(body.carga_horas_semanal),
    cargaTotalMinutos: horasParaMinutos(body.carga_horas_total),
    condicoesPactuadas: body.condicoes_pactuadas,
    bolsaValor: body.bolsa_valor,
    auxilioTransporteValor: body.auxilio_transporte_valor,
    seguroExigido: body.seguro_exigido,
  };
}

export const listEstagiosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  situacao: z.enum(["EM_FORMALIZACAO", "ATIVO", "CONCLUIDO", "RESCINDIDO"]).optional(),
  tipo: z.enum(["OBRIGATORIO", "NAO_OBRIGATORIO"]).optional(),
  curso_id: z.uuid().optional(),
  concedente_id: z.uuid().optional(),
  busca: z.string().trim().min(1).max(LIMITE.busca).optional(),
  ordem: z.enum(["estudante", "-estudante", "concedente", "-concedente", "inicio", "-inicio", "fim", "-fim", "situacao", "-situacao"]).optional(),
  estudante_id: z.uuid().optional(),
});

export const justificativaBodySchema = z.object({ justificativa: z.string().trim().min(1).max(LIMITE.justificativaEstagio) });
export const motivoBodySchema = z.object({ motivo: z.string().trim().min(1).max(2000) });
export const parecerBodySchema = z.object({ parecer: z.string().trim().min(1).max(LIMITE.parecerPlano) });
export const dispensaBodySchema = z.object({ documento_id: z.uuid().nullable() });

export const planoBodySchema = z.object({
  atividades_previstas: z.string().trim().min(1).max(LIMITE.atividadesPrevistas),
  justificativa_compatibilidade: z.string().trim().min(1).max(LIMITE.compatibilidade),
});

export const responsavelBodySchema = z.object({ papel: z.enum(["ORIENTADOR", "SUPERVISOR"]), usuario_id: z.uuid() });
export const contasResponsavelQuerySchema = z.object({ papel: z.enum(["ORIENTADOR", "SUPERVISOR"]), busca: z.string().trim().min(2).max(LIMITE.busca) });
export const substituicaoOrientadorBodySchema = z.object({ usuario_id: z.uuid(), motivo: z.string().trim().min(1).max(2000) });

export const apoliceBodySchema = z.object({
  seguradora: z.string().trim().min(1).max(LIMITE.seguradora),
  numero_apolice: z.string().trim().min(1).max(LIMITE.numeroApolice),
  contratante: z.enum(["CONCEDENTE", "INSTITUICAO"]),
  vigencia_inicio: dataSchema,
  vigencia_fim: dataSchema,
  substitui_apolice_id: z.uuid().nullish(),
  documento_id: z.uuid().nullish(),
});

export const assinaturaBodySchema = z.object({ parte: z.enum(["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"]) });

export const aditivoBodySchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("PRORROGACAO"), justificativa: z.string().trim().min(1).max(LIMITE.justificativaEstagio), nova_data_fim_pactuada: dataSchema }),
  z
    .object({
      tipo: z.literal("ALTERACAO_CARGA_HORARIA"),
      justificativa: z.string().trim().min(1).max(2000),
      nova_carga_horas_diaria: horasSchema({ min: 1 / 60, max: 24 }).optional(),
      nova_carga_horas_semanal: horasSchema({ min: 1 / 60, max: 168 }).optional(),
      nova_carga_horas_total: horasSchema({ min: 1 / 60, max: 100_000 }).optional(),
    })
    .refine((body) => body.nova_carga_horas_diaria ?? body.nova_carga_horas_semanal ?? body.nova_carga_horas_total, {
      message: "Informe ao menos uma nova carga",
    }),
  z.object({ tipo: z.literal("SUBSTITUICAO_SUPERVISOR"), justificativa: z.string().trim().min(1).max(2000), novo_supervisor_usuario_id: z.uuid() }),
]);

export function toNovoAditivo(body: z.infer<typeof aditivoBodySchema>) {
  if (body.tipo === "PRORROGACAO") return { tipo: body.tipo, justificativa: body.justificativa, novaDataFimPactuada: body.nova_data_fim_pactuada };
  if (body.tipo === "SUBSTITUICAO_SUPERVISOR") {
    return { tipo: body.tipo, justificativa: body.justificativa, novoSupervisorUsuarioId: body.novo_supervisor_usuario_id };
  }
  return {
    tipo: body.tipo,
    justificativa: body.justificativa,
    novaCargaDiariaMinutos: minutos(body.nova_carga_horas_diaria),
    novaCargaSemanalMinutos: minutos(body.nova_carga_horas_semanal),
    novaCargaTotalMinutos: minutos(body.nova_carga_horas_total),
  };
}

// RF059, RF060: leave of an active internship, with its certificate
export const afastamentoBodySchema = z
  .object({
    tipo: z.enum(["LICENCA", "ATESTADO_MEDICO", "OUTRO"]),
    descricao: z.string().trim().min(1).max(LIMITE.descricaoAfastamento).nullable().default(null),
    data_inicio: dataSchema,
    data_fim: dataSchema,
    documento_id: z.uuid(),
  })
  .refine((body) => body.data_fim >= body.data_inicio, { message: "data_fim antes de data_inicio", path: ["data_fim"] })
  .refine((body) => body.tipo !== "OUTRO" || body.descricao, { message: "Descreva o afastamento do tipo OUTRO", path: ["descricao"] });

export const substituicaoAfastamentoBodySchema = afastamentoBodySchema.and(z.object({ justificativa: z.string().trim().min(1).max(2000) }));

export function toNovoAfastamento(body: z.infer<typeof afastamentoBodySchema>) {
  return { tipo: body.tipo, descricao: body.descricao, dataInicio: body.data_inicio, dataFim: body.data_fim, documentoId: body.documento_id };
}

// RF063, RN-27: rescission requested by one of the parties, recorded by the coordination
export const rescisaoBodySchema = z.object({
  data_rescisao: dataSchema,
  solicitante: z.enum(["ESTUDANTE", "CONCEDENTE", "INSTITUICAO"]),
  motivo: z.string().trim().min(1).max(LIMITE.motivoRescisao),
  documento_id: z.uuid().nullable().default(null),
});

export const idParamSchema = z.object({ id: z.uuid() });
