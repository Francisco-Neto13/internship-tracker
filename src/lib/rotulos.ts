import type { StatusTone } from "@/shared/ui/status-badge";

// Nomes e tons de situação exibidos na interface, num lugar só: a mesma situação tem o mesmo
// nome e a mesma cor em lista, perfil, painel e notificação (REQUISITOSEREGRAS §8.4).

export const SITUACAO_ESTAGIO: Record<string, { rotulo: string; tom: StatusTone }> = {
  EM_FORMALIZACAO: { rotulo: "Em formalização", tom: "pending" },
  ATIVO: { rotulo: "Ativo", tom: "ok" },
  CONCLUIDO: { rotulo: "Concluído", tom: "neutral" },
  RESCINDIDO: { rotulo: "Rescindido", tom: "danger" },
};

export const TIPO_ESTAGIO: Record<string, string> = { OBRIGATORIO: "Obrigatório", NAO_OBRIGATORIO: "Não obrigatório" };

export const SITUACAO_ACADEMICA: Record<string, { rotulo: string; tom: StatusTone }> = {
  MATRICULADO: { rotulo: "Matriculado", tom: "ok" },
  TRANCADO: { rotulo: "Trancado", tom: "pending" },
  FORMADO: { rotulo: "Formado", tom: "neutral" },
  DESLIGADO: { rotulo: "Desligado", tom: "danger" },
};

export const SITUACAO_USUARIO: Record<string, { rotulo: string; tom: StatusTone }> = {
  ATIVO: { rotulo: "Ativo", tom: "ok" },
  INATIVO: { rotulo: "Inativo", tom: "neutral" },
};

export const SITUACAO_CONCEDENTE: Record<string, { rotulo: string; tom: StatusTone }> = {
  ATIVA: { rotulo: "Ativa", tom: "ok" },
  SUSPENSA: { rotulo: "Suspensa", tom: "danger" },
};

export const SITUACAO_ATIVIDADE: Record<string, { rotulo: string; tom: StatusTone }> = {
  EM_ANALISE: { rotulo: "Em análise", tom: "pending" },
  APROVADA: { rotulo: "Aprovada", tom: "ok" },
  RECUSADA: { rotulo: "Recusada", tom: "danger" },
  DEVOLVIDA: { rotulo: "Devolvida", tom: "pending" },
};

export const SITUACAO_RELATORIO: Record<string, { rotulo: string; tom: StatusTone }> = {
  PENDENTE: { rotulo: "Pendente", tom: "neutral" },
  EM_ANALISE: { rotulo: "Em análise", tom: "pending" },
  APROVADO: { rotulo: "Aprovado", tom: "ok" },
  DEVOLVIDO: { rotulo: "Devolvido", tom: "pending" },
};

const TODOS: Record<string, string> = Object.fromEntries(
  [SITUACAO_ESTAGIO, SITUACAO_ACADEMICA, SITUACAO_ATIVIDADE, SITUACAO_RELATORIO].flatMap((mapa) =>
    Object.entries(mapa).map(([codigo, { rotulo }]) => [codigo, rotulo.toLowerCase()]),
  ),
);

/**
 * Troca códigos de situação (EM_FORMALIZACAO, ATIVO...) pelos nomes da interface num texto vindo
 * do banco, como as mensagens de notificação gravadas pelos gatilhos.
 */
export function humanizarCodigos(texto: string): string {
  return texto.replace(/\b[A-Z][A-Z_]{3,}\b/g, (codigo) => TODOS[codigo] ?? codigo);
}
