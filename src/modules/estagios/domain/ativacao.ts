import { DomainError, type DomainErrorDetail } from "@/lib/errors";

// EM_FORMALIZACAO -> ATIVO (requisitos §8.6, ARQUITETURA §5.1, DER §5.1). Every guard is
// evaluated on facts loaded in one locked transaction, and all impediments are returned at
// once (409 ATIVACAO_BLOQUEADA), never one per request.

export type Periodo = { inicio: string; fim: string };

export type FatosAtivacao = {
  situacao: string;
  hashTce: string | null;
  dataInicio: string;
  dataFimPrevista: string;
  seguroExigido: boolean;
  concedenteAtiva: boolean;
  convenioVigenteNoInicio: boolean;
  planoAprovado: boolean;
  orientadorNoInicio: boolean;
  supervisorNoInicio: boolean;
  apolices: Periodo[];
  partesQueAssinaramOHashAtual: string[];
  estudanteMatriculado: boolean;
  outroEstagioAtivo: boolean;
};

const PARTES = ["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"] as const;

function diaSeguinte(data: string): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** RF018, RN-33: the union of the policies covers every day of [inicio, fim] (inclusive). */
export function periodoCoberto(apolices: Periodo[], alvo: Periodo): boolean {
  let coberto = alvo.inicio;
  for (const apolice of [...apolices].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    if (apolice.inicio > coberto) break;
    if (apolice.fim >= coberto) coberto = diaSeguinte(apolice.fim);
    if (coberto > alvo.fim) return true;
  }
  return coberto > alvo.fim;
}

export function impedimentosAtivacao(fatos: FatosAtivacao): DomainErrorDetail[] {
  const impedimentos: DomainErrorDetail[] = [];
  const adicionar = (code: string, issue: string, requisito: string) => impedimentos.push({ code, issue, requisito });

  if (fatos.situacao !== "EM_FORMALIZACAO") {
    adicionar("ESTAGIO_NAO_EM_FORMALIZACAO", "Só um estágio em formalização é ativado", "RF015");
    return impedimentos;
  }
  if (!fatos.concedenteAtiva) adicionar("CONCEDENTE_SUSPENSA", "A concedente está suspensa", "RF008");
  if (!fatos.convenioVigenteNoInicio) adicionar("CONVENIO_VENCIDO", "Não há convênio vigente na data de início", "RF010");
  if (!fatos.planoAprovado) adicionar("PLANO_NAO_APROVADO", "O plano de atividades não foi aprovado pelo orientador", "RF017");
  if (!fatos.orientadorNoInicio || !fatos.supervisorNoInicio) {
    const faltam = [!fatos.orientadorNoInicio && "orientador", !fatos.supervisorNoInicio && "supervisor"].filter(Boolean).join(" e ");
    adicionar("RESPONSAVEIS_INCOMPLETOS", `Falta ${faltam} vinculado na data de início`, "RF032");
  }
  if (fatos.seguroExigido && !periodoCoberto(fatos.apolices, { inicio: fatos.dataInicio, fim: fatos.dataFimPrevista })) {
    adicionar("APOLICE_AUSENTE", "Nenhuma apólice cobre todo o período do estágio", "RF018");
  }
  if (!fatos.hashTce) {
    adicionar("TCE_NAO_FECHADO", "O TCE ainda não foi fechado para assinatura", "RF019");
  } else {
    const faltantes = PARTES.filter((parte) => !fatos.partesQueAssinaramOHashAtual.includes(parte));
    if (faltantes.length > 0) adicionar("ASSINATURAS_PENDENTES", `Falta a assinatura de: ${faltantes.join(", ")}`, "RF019");
  }
  if (!fatos.estudanteMatriculado) {
    adicionar("ESTUDANTE_NAO_MATRICULADO", "O estudante não está com matrícula regular (Lei 11.788/2008, art. 3º, I)", "RF005");
  }
  if (fatos.outroEstagioAtivo) adicionar("ESTAGIO_SIMULTANEO", "O estudante já tem outro estágio ativo", "RF015");
  return impedimentos;
}

export function exigirAtivavel(fatos: FatosAtivacao): void {
  const impedimentos = impedimentosAtivacao(fatos);
  if (impedimentos.length > 0) {
    throw new DomainError({
      code: "ATIVACAO_BLOQUEADA",
      kind: "CONFLICT",
      message: "O estágio não atende às condições de ativação.",
      requisito: "RF015",
      details: impedimentos,
    });
  }
}
