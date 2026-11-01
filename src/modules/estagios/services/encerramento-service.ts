import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { lockEstagio, updateEstagio, type EstagioRow } from "../repositories/estagio-repository";
import { findRescisao, insertRescisao, type RescisaoRow } from "../repositories/rescisao-repository";
import { estagioNaoEncontrado, traduzirErroEstagio } from "./erros";

// RF045, RF063, RF064, RN-27 (DER §5.2, §5.12): the two ends of an active internship. The
// database holds the rules: app.impedimentos_conclusao refuses the conclusion with every
// impediment at once, and the rescisao triggers consolidate the hours and cancel what comes
// after the date. Both end the pending amendment and the responsibles (app.encerrar_estagio).

export type NovaRescisao = {
  dataRescisao: string;
  solicitante: RescisaoRow["solicitante"];
  motivo: string;
  documentoId: string | null;
};

const naoAtivo = () =>
  new DomainError({ code: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", message: "Só um estágio ativo é encerrado.", requisito: "RF045" });

/** RF045, RF043: ATIVO -> CONCLUIDO by the coordination, when no impediment is left. */
export async function concluirEstagio(identity: Identity, estagioId: string): Promise<EstagioRow> {
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await lockEstagio(tx, estagioId);
      if (!estagio) throw estagioNaoEncontrado();
      if (estagio.situacao !== "ATIVO") throw naoAtivo();
      const row = await updateEstagio(tx, estagioId, { situacao: "CONCLUIDO", encerradoEm: new Date() });
      if (!row) {
        throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: "O perfil atual não permite concluir o estágio.", requisito: "RF003" });
      }
      return row;
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "concluir o estágio");
  }
}

/** RF063, RF064: the coordination records the rescission requested by one of the parties. */
export async function rescindirEstagio(identity: Identity, estagioId: string, input: NovaRescisao): Promise<RescisaoRow> {
  if (input.documentoId) await exigirDocumento(identity, input.documentoId, { tipo: "RESCISAO", estagioId });
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await lockEstagio(tx, estagioId);
      if (!estagio) throw estagioNaoEncontrado();
      if (estagio.situacao !== "ATIVO") throw naoAtivo();
      return insertRescisao(tx, { estagioId, ...input, decididoPorUsuarioId: identity.userId });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "rescindir o estágio");
  }
}

export async function getRescisao(identity: Identity, estagioId: string): Promise<RescisaoRow> {
  const row = await withUser(identity, (tx) => findRescisao(tx, estagioId));
  if (!row) throw new DomainError({ code: "RESCISAO_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "O estágio não foi rescindido.", requisito: "RF063" });
  return row;
}
