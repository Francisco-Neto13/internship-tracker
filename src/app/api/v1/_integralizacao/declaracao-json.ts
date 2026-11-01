import type { DeclaracaoRow } from "@/modules/integralizacao/repositories/declaracao-repository";

export function declaracaoJson(row: DeclaracaoRow) {
  return {
    id: row.id,
    estudante_id: row.estudanteId,
    tipo: row.tipo,
    estagio_id: row.estagioId,
    apuracao_id: row.apuracaoId,
    documento_id: row.documentoId,
    codigo_verificacao: row.codigoVerificacao,
    emitida_por_usuario_id: row.emitidaPorUsuarioId,
    criado_em: row.criadoEm.toISOString(),
  };
}
