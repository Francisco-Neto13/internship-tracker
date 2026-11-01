import { minutosParaHoras } from "@/lib/horas";
import type { AditivoRow } from "@/modules/estagios/repositories/aditivo-repository";
import type { EstagioRow } from "@/modules/estagios/repositories/estagio-repository";
import type { ApoliceRow, AssinaturaRow, PlanoRow, ResponsavelRow } from "@/modules/estagios/repositories/formalizacao-repository";

// JSON shape of /api/v1/estagios and /aditivos: snake_case, hours, money as numbers

const dinheiro = (valor: string | null) => (valor === null ? null : Number(valor));
const instante = (valor: Date | null) => valor?.toISOString() ?? null;

export function estagioJson(row: EstagioRow & { estudanteNome?: string | null; matricula?: string | null; concedenteRazaoSocial?: string | null }) {
  return {
    id: row.id,
    estudante_id: row.estudanteId,
    ...(row.estudanteNome !== undefined ? { estudante_nome: row.estudanteNome, matricula: row.matricula } : {}),
    curso_id: row.cursoId,
    concedente_id: row.concedenteId,
    ...(row.concedenteRazaoSocial !== undefined ? { concedente: row.concedenteRazaoSocial } : {}),
    convenio_id: row.convenioId,
    tipo: row.tipo,
    situacao: row.situacao,
    data_inicio: row.dataInicio,
    data_fim_pactuada: row.dataFimPactuada,
    data_fim_prevista: row.dataFimPrevista,
    carga_horas_diaria: minutosParaHoras(row.cargaDiariaMinutos),
    carga_horas_semanal: minutosParaHoras(row.cargaSemanalMinutos),
    carga_horas_total: minutosParaHoras(row.cargaTotalMinutos),
    condicoes_pactuadas: row.condicoesPactuadas,
    bolsa_valor: dinheiro(row.bolsaValor),
    auxilio_transporte_valor: dinheiro(row.auxilioTransporteValor),
    seguro_exigido: row.seguroExigido,
    hash_tce: row.hashTce,
    tce_fechado_em: instante(row.tceFechadoEm),
    justificativa_reabertura: row.justificativaReabertura,
    dispensa_duracao_maxima: row.dispensaDuracaoMaxima,
    dispensa_documento_id: row.dispensaDocumentoId,
    ativado_em: instante(row.ativadoEm),
    encerrado_em: instante(row.encerradoEm),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function planoJson(row: PlanoRow) {
  return {
    id: row.id,
    versao: row.versao,
    atividades_previstas: row.atividadesPrevistas,
    justificativa_compatibilidade: row.justificativaCompatibilidade,
    situacao: row.situacao,
    parecer: row.parecer,
    decidido_por_usuario_id: row.decididoPorUsuarioId,
    decidido_em: instante(row.decididoEm),
    elaborado_por_usuario_id: row.elaboradoPorUsuarioId,
    criado_em: row.criadoEm.toISOString(),
  };
}

export function responsavelJson(row: ResponsavelRow) {
  return {
    id: row.id,
    papel: row.papel,
    usuario_id: row.usuarioId,
    ...(row.usuarioNome !== undefined ? { usuario_nome: row.usuarioNome } : {}),
    vigencia_inicio: row.vigenciaInicio,
    vigencia_fim: row.vigenciaFim,
    anulado: row.vigenciaFim !== null && row.vigenciaFim === row.vigenciaInicio,
    substitui_responsavel_id: row.substituiResponsavelId,
    motivo_substituicao: row.motivoSubstituicao,
    decidido_por_usuario_id: row.decididoPorUsuarioId,
    aditivo_id: row.aditivoId,
  };
}

export function apoliceJson(row: ApoliceRow) {
  return {
    id: row.id,
    seguradora: row.seguradora,
    numero_apolice: row.numeroApolice,
    contratante: row.contratante,
    vigencia_inicio: row.vigenciaInicio,
    vigencia_fim: row.vigenciaFim,
    substitui_apolice_id: row.substituiApoliceId,
    documento_id: row.documentoId,
    registrado_por_usuario_id: row.registradoPorUsuarioId,
    criado_em: row.criadoEm.toISOString(),
  };
}

export function assinaturaJson(row: AssinaturaRow) {
  return {
    id: row.id,
    aditivo_id: row.aditivoId,
    parte: row.parte,
    signatario_usuario_id: row.signatarioUsuarioId,
    signatario_nome: row.signatarioNome,
    signatario_perfil: row.signatarioPerfil,
    hash_documento: row.hashDocumento,
    endereco_ip: row.enderecoIp,
    assinado_em: row.criadoEm.toISOString(),
  };
}

export function aditivoJson(row: AditivoRow) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    numero: row.numero,
    tipo: row.tipo,
    justificativa: row.justificativa,
    situacao: row.situacao,
    snapshot_anterior: row.snapshotAnterior,
    nova_data_fim_pactuada: row.novaDataFimPactuada,
    nova_carga_horas_diaria: row.novaCargaDiariaMinutos === null ? null : minutosParaHoras(row.novaCargaDiariaMinutos),
    nova_carga_horas_semanal: row.novaCargaSemanalMinutos === null ? null : minutosParaHoras(row.novaCargaSemanalMinutos),
    nova_carga_horas_total: row.novaCargaTotalMinutos === null ? null : minutosParaHoras(row.novaCargaTotalMinutos),
    novo_supervisor_usuario_id: row.novoSupervisorUsuarioId,
    hash_conteudo: row.hashConteudo,
    efetivado_em: instante(row.efetivadoEm),
    motivo_cancelamento: row.motivoCancelamento,
    criado_em: row.criadoEm.toISOString(),
  };
}
