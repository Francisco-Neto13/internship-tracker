import type { StatusTone } from "@/shared/ui/status-badge";
import { formatarDataCurta } from "./datas";

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

export const TIPO_DECLARACAO: Record<string, string> = { CONCLUSAO_ESTAGIO: "Conclusão de estágio", INTEGRALIZACAO_ATIVIDADES: "Integralização de atividades complementares" };

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

/** Nome legível de cada tabela auditada, para a trilha e o painel do administrador. */
export const TABELA_AUDITORIA: Record<string, string> = {
  usuario: "Conta de usuário",
  vinculo_perfil: "Perfil e vínculo",
  curso: "Curso",
  estudante: "Estudante",
  parametro_institucional: "Parâmetro institucional",
  concedente: "Concedente",
  convenio: "Convênio",
  convenio_vigencia: "Vigência de convênio",
  documento: "Documento",
  estagio: "Estágio",
  plano_atividades: "Plano de atividades",
  responsavel_estagio: "Responsável do estágio",
  apolice_seguro: "Apólice de seguro",
  assinatura: "Assinatura",
  aditivo: "Aditivo",
  afastamento: "Afastamento",
  rescisao: "Rescisão",
  registro_frequencia: "Lançamento de frequência",
  homologacao_frequencia: "Homologação de frequência",
  divergencia_carga_horaria: "Divergência de carga",
  relatorio: "Relatório de estágio",
  versao_relatorio: "Versão de relatório",
  parecer_relatorio: "Parecer de relatório",
  avaliacao_desempenho: "Avaliação de desempenho",
  acompanhamento: "Acompanhamento",
  atividade_complementar: "Atividade complementar",
  analise_atividade: "Análise de atividade",
  declaracao: "Declaração",
  resposta_avaliacao: "Nota de critério de avaliação",
  criterio_avaliacao: "Critério de avaliação",
  categoria_atividade: "Categoria de atividade",
  exigencia_categoria: "Limite de categoria no curso",
  periodicidade_relatorio: "Periodicidade de relatórios",
  historico_situacao_concedente: "Situação da concedente",
  comprovante_atividade: "Comprovante de atividade",
  anexo_relatorio: "Anexo de relatório",
  porte_concedente: "Porte de concedente",
  setor_atuacao: "Setor de atuação",
};

export const OPERACAO_AUDITORIA: Record<string, string> = { INSERT: "criado", UPDATE: "alterado", DELETE: "removido", LEITURA: "lido" };

export function descreverOperacao(tabela: string, operacao: string): string {
  return `${TABELA_AUDITORIA[tabela] ?? tabela} ${OPERACAO_AUDITORIA[operacao] ?? operacao.toLowerCase()}`;
}

/** "11.222.333/0001-81" (também o CNPJ alfanumérico de 2026, mesmo formato). */
export function formatarCnpj(cnpj: string): string {
  return cnpj.length === 14 ? cnpj.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5") : cnpj;
}

/**
 * Como chamar um estágio numa lista: o nome do estudante, que quem acompanha o estágio lê
 * (app.identidades_estudante). Sem nome, a data de início separa as linhas.
 */
export function identificarEstagio(estagio: { estudanteNome: string | null; dataInicio: string }): string {
  return estagio.estudanteNome ?? `Início em ${formatarDataCurta(estagio.dataInicio)}`;
}
