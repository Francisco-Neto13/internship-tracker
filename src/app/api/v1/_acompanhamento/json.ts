import { minutosParaHoras } from "@/lib/horas";
import type { Divergencia, TotaisFrequencia } from "@/modules/acompanhamento/domain/carga";
import type { DivergenciaRow, EstagioAcompanhado, FrequenciaRow, HomologacaoRow } from "@/modules/acompanhamento/repositories/frequencia-repository";
import type { AcompanhamentoRow, AvaliacaoRow, CriterioRow, RespostaRow } from "@/modules/acompanhamento/repositories/avaliacao-repository";
import type { AnexoRow, ParecerRow, RelatorioRow, VersaoRow } from "@/modules/acompanhamento/repositories/relatorio-repository";

// JSON shape of the M05 routes: snake_case, hours instead of minutes (AGENTS.md). Kept in a
// private folder (_acompanhamento) so it never becomes a route.

const instante = (valor: Date | null) => valor?.toISOString() ?? null;
const hhmm = (valor: string | null) => valor?.slice(0, 5) ?? null;

export function frequenciaJson(row: FrequenciaRow) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    data: row.data,
    hora_entrada: hhmm(row.horaEntrada),
    hora_saida: hhmm(row.horaSaida),
    intervalo_horas: minutosParaHoras(row.intervaloMinutos),
    horas: minutosParaHoras(row.duracaoMinutos),
    observacao: row.observacao,
    situacao: row.situacao,
    excedeu_limite: row.excedeuLimite,
    limite_diario_horas: minutosParaHoras(row.limiteDiarioAplicadoMinutos),
    limite_semanal_horas: minutosParaHoras(row.limiteSemanalAplicadoMinutos),
    parametro_institucional_id: row.parametroInstitucionalId,
    substitui_registro_id: row.substituiRegistroId,
    justificativa_ajuste: row.justificativaAjuste,
    homologacao_id: row.homologacaoId,
    justificativa_cancelamento: row.justificativaCancelamento,
    registrado_por_usuario_id: row.registradoPorUsuarioId,
    criado_em: row.criadoEm.toISOString(),
    // RF025: the entry was recorded over a limit and waits for the supervisor's analysis
    ...(row.situacao === "SINALIZADO" ? { aviso: "Lançamento acima do limite de jornada, sinalizado para análise." } : {}),
  };
}

export function homologacaoJson(row: HomologacaoRow) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    periodo_inicio: row.periodoInicio,
    periodo_fim: row.periodoFim,
    horas_homologadas: minutosParaHoras(row.minutosHomologados),
    observacao: row.observacao,
    homologado_por_usuario_id: row.homologadoPorUsuarioId,
    ...(row.homologadoPorNome !== undefined ? { homologado_por_nome: row.homologadoPorNome } : {}),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function divergenciaJson(row: DivergenciaRow) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    data_referencia: row.dataReferencia,
    horas_previstas: minutosParaHoras(row.minutosPrevistos),
    horas_cumpridas: minutosParaHoras(row.minutosCumpridos),
    tolerancia_percentual: row.toleranciaPercentual,
    situacao: row.situacao,
    parecer: row.parecer,
    analisada_por_usuario_id: row.analisadaPorUsuarioId,
    analisada_em: instante(row.analisadaEm),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function divergenciaCalculadaJson(divergencia: Divergencia) {
  return {
    data_referencia: divergencia.dataReferencia,
    horas_previstas: minutosParaHoras(divergencia.minutosPrevistos),
    horas_cumpridas: minutosParaHoras(divergencia.minutosCumpridos),
    percentual: divergencia.percentual,
    tolerancia_percentual: divergencia.toleranciaPercentual,
    avaliada: divergencia.avaliada,
    divergente: divergencia.divergente,
  };
}

export function cargaHorariaJson(
  resumo: TotaisFrequencia & { cargaTotalMinutos: number; saldoMinutos: number; percentualConclusao: number },
  divergencia: Divergencia,
  divergenciaAbertaId: string | null,
) {
  return {
    carga_total_horas: minutosParaHoras(resumo.cargaTotalMinutos),
    horas_cumpridas: minutosParaHoras(resumo.minutosCumpridos),
    horas_homologadas: minutosParaHoras(resumo.minutosHomologados),
    horas_pendentes_homologacao: minutosParaHoras(resumo.minutosPendentes),
    lancamentos_sinalizados: resumo.lancamentosSinalizados,
    saldo_horas: minutosParaHoras(resumo.saldoMinutos),
    percentual_conclusao: resumo.percentualConclusao,
    divergencia: { ...divergenciaCalculadaJson(divergencia), aberta_id: divergenciaAbertaId },
  };
}

export function estagioAcompanhadoJson(estagio: EstagioAcompanhado) {
  return {
    id: estagio.id,
    tipo: estagio.tipo,
    situacao: estagio.situacao,
    curso_id: estagio.cursoId,
    data_inicio: estagio.dataInicio,
    data_fim_prevista: estagio.dataFimPrevista,
    carga_horas_semanal: minutosParaHoras(estagio.cargaSemanalMinutos),
    carga_horas_total: minutosParaHoras(estagio.cargaTotalMinutos),
  };
}

type RelatorioExibido = RelatorioRow & {
  emAtraso: boolean;
  pendenteDe: "ESTUDANTE" | "ORIENTADOR" | null;
};

export function relatorioJson(row: RelatorioExibido) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    tipo: row.tipo,
    sequencia: row.sequencia,
    periodo_inicio: row.periodoInicio,
    periodo_fim: row.periodoFim,
    prazo_entrega: row.prazoEntrega,
    situacao: row.situacao,
    // Requisitos v1.2 §8.6: shown, derived from the deadline, never stored
    em_atraso: row.emAtraso,
    pendente_de: row.pendenteDe,
    aprovado_em: instante(row.aprovadoEm),
  };
}

type Versao = VersaoRow & {
  enviadaComAtraso: boolean;
  anexos: AnexoRow[];
  parecer: ParecerRow | null;
};

export function parecerJson(parecer: { id: string; decisao: string; texto: string | null; emitidoPorUsuarioId: string; criadoEm: Date; emitidoPorNome?: string | null }) {
  return {
    id: parecer.id,
    decisao: parecer.decisao,
    texto: parecer.texto,
    emitido_por_usuario_id: parecer.emitidoPorUsuarioId,
    ...(parecer.emitidoPorNome !== undefined ? { emitido_por_nome: parecer.emitidoPorNome } : {}),
    criado_em: parecer.criadoEm.toISOString(),
  };
}

export function versaoJson(versao: Versao) {
  return {
    id: versao.id,
    numero: versao.numero,
    conteudo: versao.conteudo,
    enviado_por_usuario_id: versao.enviadoPorUsuarioId,
    enviado_em: versao.criadoEm.toISOString(),
    enviada_com_atraso: versao.enviadaComAtraso,
    anexos: versao.anexos.map((anexo) => ({ documento_id: anexo.documentoId, nome_original: anexo.nomeOriginal })),
    parecer: versao.parecer ? parecerJson(versao.parecer) : null,
  };
}

export function criterioJson(row: CriterioRow) {
  return {
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    escala_minima: row.escalaMinima,
    escala_maxima: row.escalaMaxima,
    ordem: row.ordem,
    ativo: row.ativo,
  };
}

export function avaliacaoJson(row: AvaliacaoRow & { respostas: RespostaRow[] }) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    momento: row.momento,
    periodo_inicio: row.periodoInicio,
    periodo_fim: row.periodoFim,
    observacoes: row.observacoes,
    avaliador_usuario_id: row.avaliadorUsuarioId,
    ...(row.avaliadorNome !== undefined ? { avaliador_nome: row.avaliadorNome } : {}),
    avaliador_perfil: row.avaliadorPerfil,
    // RF014: grades normalized to 0..10 and averaged
    ...(row.media !== undefined ? { media: row.media } : {}),
    respostas: row.respostas.map((resposta) => ({ criterio_id: resposta.criterioId, nota: resposta.nota, comentario: resposta.comentario })),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function acompanhamentoJson(row: AcompanhamentoRow) {
  return {
    id: row.id,
    estagio_id: row.estagioId,
    tipo: row.tipo,
    data_ocorrencia: row.dataOcorrencia,
    participantes: row.participantes,
    observacoes: row.observacoes,
    registrado_por_usuario_id: row.registradoPorUsuarioId,
    ...(row.registradoPorNome !== undefined ? { registrado_por_nome: row.registradoPorNome } : {}),
    criado_em: row.criadoEm.toISOString(),
    atualizado_em: row.atualizadoEm.toISOString(),
  };
}
