import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { findAfastamentoById, findAfastamentos, insertAfastamento, periodosAfastamento, type AfastamentoRow } from "../repositories/afastamento-repository";
import { findEstagioById, lockEstagio } from "../repositories/estagio-repository";
import { estagioNaoEncontrado, traduzirErroEstagio } from "./erros";

// RF030, RF059, RF060, RN-25 (DER §4.4, D1). The coordination registers the leave with its
// certificate; the database computes the extension (same calendar days, up to the 2-year cap
// at the concedente) and moves data_fim_prevista in the same transaction. A correction is a
// new row that replaces the previous one.

export type NovoAfastamento = {
  tipo: AfastamentoRow["tipo"];
  descricao: string | null;
  dataInicio: string;
  dataFim: string;
  documentoId: string;
};

export async function listAfastamentos(identity: Identity, estagioId: string): Promise<AfastamentoRow[]> {
  return withUser(identity, async (tx) => {
    if (!(await findEstagioById(tx, estagioId))) throw estagioNaoEncontrado();
    return findAfastamentos(tx, estagioId);
  });
}

/** Dates of the valid leaves, for whoever reads the internship (frequency, workload). */
export async function listPeriodosAfastamento(identity: Identity, estagioId: string) {
  return withUser(identity, (tx) => periodosAfastamento(tx, estagioId));
}

async function gravar(identity: Identity, estagioId: string, input: NovoAfastamento, substituicao?: { id: string; justificativa: string }) {
  await exigirDocumento(identity, input.documentoId, { tipo: "ATESTADO_AFASTAMENTO", estagioId });
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await lockEstagio(tx, estagioId);
      if (!estagio) throw estagioNaoEncontrado();
      if (estagio.situacao !== "ATIVO") {
        throw new DomainError({ code: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", message: "Afastamento só em estágio ativo.", requisito: "RF059" });
      }
      return insertAfastamento(tx, {
        estagioId,
        ...input,
        registradoPorUsuarioId: identity.userId,
        substituiAfastamentoId: substituicao?.id ?? null,
        justificativaSubstituicao: substituicao?.justificativa ?? null,
        dataFimPrevista: estagio.dataFimPrevista,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "registrar o afastamento");
  }
}

/** RF059, RF060: registers a leave of an active internship. */
export async function registrarAfastamento(identity: Identity, estagioId: string, input: NovoAfastamento): Promise<AfastamentoRow> {
  return gravar(identity, estagioId, input);
}

/** RN-28: corrects a leave with a new row; the previous one becomes SUBSTITUIDO. */
export async function substituirAfastamento(identity: Identity, id: string, input: NovoAfastamento, justificativa: string): Promise<AfastamentoRow> {
  const anterior = await withUser(identity, (tx) => findAfastamentoById(tx, id));
  if (!anterior) {
    throw new DomainError({ code: "AFASTAMENTO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Afastamento não encontrado.", requisito: "RF059" });
  }
  return gravar(identity, anterior.estagioId, input, { id, justificativa });
}
