import { isTriggerRule } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError, type DomainErrorKind } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { getArmazenamento } from "@/shared/documentos/armazenamento";
import { chaveParaEliminacao, eliminarDocumento, findDocumentosEmGuarda } from "../repositories/guarda-repository";

// RF069, RN-30 (DER §5.11): retention of documents. The period counts from the end of the
// scope and is set by the database; the elimination is never automatic: the administrator
// removes the object from the storage and the row stays with its hash, marked as eliminated.

const REGRAS: { codigo: string; kind: DomainErrorKind; mensagem: string }[] = [
  { codigo: "ELIMINACAO_RESTRITA", kind: "FORBIDDEN", mensagem: "Só o administrador elimina documentos." },
  { codigo: "DOCUMENTO_NAO_ENCONTRADO", kind: "NOT_FOUND", mensagem: "Documento inexistente ou já eliminado." },
  { codigo: "EXCLUSAO_BLOQUEADA_GUARDA", kind: "CONFLICT", mensagem: "O prazo de guarda do documento ainda não foi atingido." },
];

function traduzir(error: unknown): unknown {
  for (const regra of REGRAS) {
    if (isTriggerRule(error, regra.codigo)) return new DomainError({ code: regra.codigo, kind: regra.kind, message: regra.mensagem, requisito: "RF069" });
  }
  return error;
}

/** Documents whose retention ends until `ate` (null: today) and are not eliminated (administrator only). */
export async function listDocumentosEmGuarda(identity: Identity, ate: string | null) {
  return withUser(identity, (tx) => findDocumentosEmGuarda(tx, ate));
}

/**
 * Removes the object first and marks the row after: if the storage fails nothing is marked,
 * and a retry after a failed mark removes nothing twice (deleting a missing object is a no-op).
 */
export async function eliminarDocumentoVencido(identity: Identity, documentoId: string): Promise<{ id: string; eliminadoEm: Date }> {
  try {
    const chave = await withUser(identity, (tx) => chaveParaEliminacao(tx, documentoId));
    await getArmazenamento().remover(chave);
    return { id: documentoId, eliminadoEm: await withUser(identity, (tx) => eliminarDocumento(tx, documentoId)) };
  } catch (error) {
    throw traduzir(error);
  }
}
