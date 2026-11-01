import type { NotificacaoRow } from "@/shared/notificacoes/notificacao-repository";

export function notificacaoJson(row: NotificacaoRow) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    entidade: row.entidade,
    entidade_id: row.entidadeId,
    lida_em: row.lidaEm?.toISOString() ?? null,
    criado_em: row.criadoEm.toISOString(),
  };
}
