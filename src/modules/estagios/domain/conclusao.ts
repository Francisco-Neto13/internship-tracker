import type { DomainErrorDetail } from "@/lib/errors";

// ATIVO -> CONCLUIDO guards (DER-LOGICO §5.2). The list is calculated by
// app.impedimentos_conclusao in the database, which also refuses the transition; this module
// gives each code its message and requirement, for the pending list (M05) and the refusal (M04).

export const IMPEDIMENTOS_CONCLUSAO = {
  CARGA_MINIMA_NAO_CUMPRIDA: { mensagem: "A carga horária homologada não atingiu o mínimo do curso.", requisito: "RF045" },
  RELATORIO_FINAL_PENDENTE: { mensagem: "O relatório final ainda não foi aprovado.", requisito: "RF041" },
  AVALIACAO_PENDENTE: { mensagem: "A avaliação de desempenho final da concedente não foi registrada.", requisito: "RF043" },
  FREQUENCIA_NAO_HOMOLOGADA: { mensagem: "Há lançamentos de frequência aguardando homologação.", requisito: "RF027" },
  ESTAGIO_NAO_ENCONTRADO: { mensagem: "Estágio não encontrado.", requisito: "RF015" },
} as const;

export type ImpedimentoConclusao = keyof typeof IMPEDIMENTOS_CONCLUSAO;

export function detalharImpedimentos(codigos: string[]): DomainErrorDetail[] {
  return codigos.map((codigo) => {
    const conhecido = IMPEDIMENTOS_CONCLUSAO[codigo as ImpedimentoConclusao];
    return { code: codigo, issue: conhecido?.mensagem ?? codigo, requisito: conhecido?.requisito };
  });
}
