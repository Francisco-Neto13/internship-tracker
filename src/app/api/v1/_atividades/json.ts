import { minutosParaHoras } from "@/lib/horas";
import type { Aproveitamento } from "@/modules/atividades/domain/aproveitamento";
import type { AnaliseRow, AtividadeRow, ComprovanteRow } from "@/modules/atividades/repositories/atividade-repository";

// JSON shape of the M06 routes: snake_case, hours instead of minutes (AGENTS.md)

const horas = (minutos: number | null) => (minutos === null ? null : minutosParaHoras(minutos));

export function atividadeJson(row: AtividadeRow) {
  return {
    id: row.id,
    estudante_id: row.estudanteId,
    ...(row.estudanteNome !== undefined ? { estudante_nome: row.estudanteNome, matricula: row.matricula } : {}),
    categoria_id: row.categoriaId,
    ...(row.categoriaNome !== undefined ? { categoria: row.categoriaNome } : {}),
    descricao: row.descricao,
    instituicao_promotora: row.instituicaoPromotora,
    data_inicio: row.dataInicio,
    data_fim: row.dataFim,
    horas_declaradas: horas(row.horasDeclaradasMinutos),
    horas_aproveitadas: horas(row.horasAproveitadasMinutos),
    // RF051: the part not counted, told to the student
    horas_excedentes: row.horasAproveitadasMinutos === null ? null : horas(row.horasDeclaradasMinutos - row.horasAproveitadasMinutos),
    situacao: row.situacao,
    origem_estagio_id: row.origemEstagioId,
    enviada_em: row.enviadaEm.toISOString(),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function comprovanteJson(row: ComprovanteRow) {
  return { id: row.id, documento_id: row.documentoId, nome_original: row.nomeOriginal ?? null, valido: row.valido, criado_em: row.criadoEm.toISOString() };
}

export function analiseJson(row: AnaliseRow) {
  return {
    id: row.id,
    decisao: row.decisao,
    motivo: row.motivo,
    horas_aproveitadas: horas(row.horasAproveitadasMinutos),
    horas_excedentes: horas(row.minutosExcedentes),
    motivo_excedente: row.motivoExcedente,
    analisado_por_usuario_id: row.analisadoPorUsuarioId,
    ...(row.analisadoPorNome !== undefined ? { analisado_por_nome: row.analisadoPorNome } : {}),
    criado_em: row.criadoEm.toISOString(),
  };
}

export function previaJson(previa: Aproveitamento | null) {
  return previa
    ? { horas_aproveitaveis: minutosParaHoras(previa.aproveitadosMinutos), horas_excedentes: minutosParaHoras(previa.excedentesMinutos), limitado_por: previa.limitadoPor }
    : null;
}
