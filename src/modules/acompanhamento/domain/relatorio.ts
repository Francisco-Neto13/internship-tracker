// RF037, RF040 (requisitos v1.2 §8.6, DER §4.5): "em atraso" is shown but never stored. A
// report is late while it is owed (PENDENTE or DEVOLVIDO) after its deadline; a version sent
// after the deadline is accepted and marked as sent late (RF037, §9.1 P9).

export type SituacaoRelatorio = "PENDENTE" | "EM_ANALISE" | "DEVOLVIDO" | "APROVADO";

export function relatorioEmAtraso(relatorio: { situacao: SituacaoRelatorio; prazoEntrega: string }, hoje: string): boolean {
  return (relatorio.situacao === "PENDENTE" || relatorio.situacao === "DEVOLVIDO") && relatorio.prazoEntrega < hoje;
}

/** `enviadoEm` is the calendar date of the sending in the institution's time zone. */
export function enviadoComAtraso(prazoEntrega: string, enviadoEm: string): boolean {
  return enviadoEm > prazoEntrega;
}

/** RF040: who has to act on the report now. */
export function pendenteDe(situacao: SituacaoRelatorio): "ESTUDANTE" | "ORIENTADOR" | null {
  if (situacao === "PENDENTE" || situacao === "DEVOLVIDO") return "ESTUDANTE";
  if (situacao === "EM_ANALISE") return "ORIENTADOR";
  return null;
}
