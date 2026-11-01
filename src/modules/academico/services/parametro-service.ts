import { isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { dataLocal, PARAMETROS_PADRAO, type Parametros } from "../domain/parametros";
import { findHistoricoParametros, findParametroVigente, insertParametro } from "../repositories/parametro-repository";

/** Parameters in force on `data` inside an open transaction; legal defaults when none was recorded. */
export async function parametrosVigentesEm(tx: Transaction, data: string): Promise<Parametros & { origem: "INSTITUCIONAL" | "PADRAO_LEGAL" }> {
  const vigente = await findParametroVigente(tx, data);
  if (!vigente) return { ...PARAMETROS_PADRAO, origem: "PADRAO_LEGAL" };
  return {
    vigenciaInicio: vigente.vigenciaInicio,
    limiteDiarioObrigatorioMinutos: vigente.limiteDiarioObrigatorioMinutos,
    limiteDiarioNaoObrigatorioMinutos: vigente.limiteDiarioNaoObrigatorioMinutos,
    limiteSemanalMinutos: vigente.limiteSemanalMinutos,
    bloquearExcedente: vigente.bloquearExcedente,
    duracaoMaximaMeses: vigente.duracaoMaximaMeses,
    toleranciaDivergenciaPercentual: vigente.toleranciaDivergenciaPercentual,
    prazoGuardaAnos: vigente.prazoGuardaAnos,
    antecedenciaAlertaConvenioDias: vigente.antecedenciaAlertaConvenioDias,
    origem: "INSTITUCIONAL",
  };
}

export async function getParametrosVigentes(identity: Identity, data: string = dataLocal()) {
  return withUser(identity, (tx) => parametrosVigentesEm(tx, data));
}

export async function listHistoricoParametros(identity: Identity) {
  return withUser(identity, (tx) => findHistoricoParametros(tx));
}

/**
 * RF006: records a new version. Never retroactive (DER-LOGICO §5.5): vigencia_inicio is
 * today or later, checked here for the message and by the RLS policy as the barrier.
 */
export async function definirParametros(
  identity: Identity,
  input: Omit<Parametros, "vigenciaInicio"> & { vigenciaInicio: string },
) {
  if (input.vigenciaInicio < dataLocal()) {
    throw new DomainError({
      code: "PARAMETRO_RETROATIVO",
      kind: "UNPROCESSABLE",
      message: "A vigência dos parâmetros não pode começar no passado.",
      requisito: "RF006",
    });
  }
  try {
    return await withUser(identity, (tx) => insertParametro(tx, { ...input, definidoPorUsuarioId: identity.userId }));
  } catch (error) {
    if (isRlsViolation(error)) {
      throw new DomainError({
        code: "ACESSO_NEGADO",
        kind: "FORBIDDEN",
        message: "O perfil atual não permite definir parâmetros institucionais.",
        requisito: "RF003",
      });
    }
    if (isUniqueViolation(error, "parametro_institucional_vigencia_inicio_unique")) {
      throw new DomainError({
        code: "PARAMETRO_DUPLICADO",
        kind: "CONFLICT",
        message: "Já existe uma versão de parâmetros com esta data de início.",
        requisito: "RF006",
      });
    }
    throw error;
  }
}
