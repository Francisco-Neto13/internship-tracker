import { isExclusionViolation, isForeignKeyViolation, isRlsViolation, isTriggerRule, isUniqueViolation, triggerRuleDetail } from "@/db/errors";
import { DomainError, type DomainErrorKind } from "@/lib/errors";
import { detalharImpedimentos } from "../domain/conclusao";

// Database rules of M04 (triggers, unique and exclusion constraints) translated into stable
// domain codes. The services check most of them first for a clear message; these are the
// barriers when a race or a direct path reaches the database.

const REGRAS_DE_GATILHO: { codigo: string; kind: DomainErrorKind; mensagem: string; requisito: string }[] = [
  { codigo: "TRANSICAO_ESTAGIO_INVALIDA", kind: "CONFLICT", mensagem: "A situação do estágio não permite esta transição.", requisito: "RF015" },
  { codigo: "ALTERACAO_ESTAGIO_VEDADA", kind: "CONFLICT", mensagem: "O TCE não pode ser alterado neste momento: reabra-o ou use um aditivo.", requisito: "RF020" },
  { codigo: "PLANO_IMUTAVEL", kind: "CONFLICT", mensagem: "O conteúdo do plano só muda em rascunho.", requisito: "RF016" },
  { codigo: "TRANSICAO_PLANO_INVALIDA", kind: "CONFLICT", mensagem: "A situação do plano não permite esta transição.", requisito: "RF017" },
  { codigo: "DECISAO_PLANO_RESTRITA", kind: "FORBIDDEN", mensagem: "Só o professor orientador do estágio decide o plano.", requisito: "RF017" },
  { codigo: "PERFIL_INCOMPATIVEL", kind: "UNPROCESSABLE", mensagem: "O usuário não tem perfil vigente compatível com a função no estágio.", requisito: "RF031" },
  { codigo: "ASSINATURA_DE_TERCEIRO", kind: "FORBIDDEN", mensagem: "Cada parte assina por si.", requisito: "RF019" },
  { codigo: "TCE_NAO_FECHADO", kind: "CONFLICT", mensagem: "O TCE só é assinado depois de fechado e antes da ativação.", requisito: "RF019" },
  { codigo: "HASH_DIVERGENTE", kind: "CONFLICT", mensagem: "A assinatura não corresponde ao documento vigente.", requisito: "RF019" },
  { codigo: "ADITIVO_NAO_ASSINAVEL", kind: "CONFLICT", mensagem: "O aditivo não está aguardando assinaturas.", requisito: "RF020" },
  { codigo: "REGISTRO_IMUTAVEL", kind: "CONFLICT", mensagem: "O registro não pode ser alterado.", requisito: "RN-28" },
];

const UNICOS: Record<string, { codigo: string; mensagem: string; requisito: string }> = {
  estagio_um_ativo_por_estudante: { codigo: "ESTAGIO_SIMULTANEO", mensagem: "O estudante já tem um estágio ativo.", requisito: "RF015" },
  assinatura_tce_parte_hash_unique: { codigo: "ASSINATURA_DUPLICADA", mensagem: "Esta parte já assinou este TCE.", requisito: "RF019" },
  assinatura_aditivo_parte_unique: { codigo: "ASSINATURA_DUPLICADA", mensagem: "Esta parte já assinou este aditivo.", requisito: "RF020" },
  plano_uma_versao_em_elaboracao: { codigo: "PLANO_EM_ELABORACAO", mensagem: "Já existe uma versão do plano em elaboração.", requisito: "RF016" },
  aditivo_um_pendente: { codigo: "ADITIVO_PENDENTE", mensagem: "Já existe um aditivo aguardando assinaturas.", requisito: "RF020" },
  apolice_seguro_substitui_apolice_id_unique: { codigo: "APOLICE_JA_SUBSTITUIDA", mensagem: "Esta apólice já foi substituída.", requisito: "RF018" },
};

export function traduzirErroEstagio(error: unknown, acao: string): unknown {
  if (error instanceof DomainError) return error;
  // DER §5.2: the conclusion refused by the database lists every impediment at once
  const impedimentos = triggerRuleDetail(error, "CONCLUSAO_BLOQUEADA");
  if (impedimentos !== undefined) {
    return new DomainError({
      code: "CONCLUSAO_BLOQUEADA",
      kind: "CONFLICT",
      message: "O estágio ainda não pode ser concluído.",
      requisito: "RF045",
      details: detalharImpedimentos(impedimentos.split(",").filter(Boolean)),
    });
  }
  if (isRlsViolation(error)) {
    return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
  }
  for (const regra of REGRAS_DE_GATILHO) {
    if (isTriggerRule(error, regra.codigo)) {
      return new DomainError({ code: regra.codigo, kind: regra.kind, message: regra.mensagem, requisito: regra.requisito });
    }
  }
  for (const [constraint, regra] of Object.entries(UNICOS)) {
    if (isUniqueViolation(error, constraint)) {
      return new DomainError({ code: regra.codigo, kind: "CONFLICT", message: regra.mensagem, requisito: regra.requisito });
    }
  }
  if (isExclusionViolation(error, "responsavel_sem_sobreposicao")) {
    return new DomainError({
      code: "RESPONSAVEL_SOBREPOSTO",
      kind: "CONFLICT",
      message: "Já existe responsável nesta função no período; use a substituição.",
      requisito: "RN-10",
    });
  }
  if (isForeignKeyViolation(error, "estagio_convenio_id_convenio_id_fk") || isForeignKeyViolation(error, "estagio_concedente_id_concedente_id_fk")) {
    return new DomainError({ code: "REFERENCIA_INEXISTENTE", kind: "UNPROCESSABLE", message: "Concedente ou convênio inexistente.", requisito: "RF015" });
  }
  return error;
}

export const estagioNaoEncontrado = () =>
  new DomainError({ code: "ESTAGIO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Estágio não encontrado.", requisito: "RF015" });
