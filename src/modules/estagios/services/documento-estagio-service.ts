import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { gerarPdfDocumento } from "@/lib/pdf";
import { documentoAditivo, documentoPlano, documentoRescisao, documentoTce } from "../domain/documentos";
import { findAditivoById } from "../repositories/aditivo-repository";
import { findEstagioById, findIdentificacaoEstagio } from "../repositories/estagio-repository";
import { findApolices, findAssinaturas, findPlanos, findResponsaveis, nomeDoUsuario } from "../repositories/formalizacao-repository";
import { findRescisao } from "../repositories/rescisao-repository";
import { estagioNaoEncontrado } from "./erros";

// RF022: PDFs of the TCE, the activity plan and an amendment, generated on request from the
// data in force for whoever reads the internship (RLS decides). Nothing is stored: the signed
// object is the hash of the content, which the PDF prints.

async function carregar(tx: Transaction, estagioId: string) {
  const estagio = await findEstagioById(tx, estagioId);
  if (!estagio) throw estagioNaoEncontrado();
  return { estagio, identificacao: await findIdentificacaoEstagio(tx, estagio) };
}

export async function pdfTce(identity: Identity, estagioId: string): Promise<Uint8Array> {
  const documento = await withUser(identity, async (tx) => {
    const { estagio, identificacao } = await carregar(tx, estagioId);
    const responsaveis = await Promise.all(
      (await findResponsaveis(tx, estagioId)).map(async (item) => ({ ...item, nome: await nomeDoUsuario(tx, item.usuarioId) })),
    );
    const apolices = await findApolices(tx, estagioId);
    return documentoTce(estagio, identificacao, { responsaveis, apolice: apolices.at(-1) ?? null, assinaturas: await findAssinaturas(tx, estagioId) });
  });
  return gerarPdfDocumento(documento);
}

/** The latest version of the plan (the approved one once there is one). */
export async function pdfPlano(identity: Identity, estagioId: string): Promise<Uint8Array> {
  const documento = await withUser(identity, async (tx) => {
    const { identificacao } = await carregar(tx, estagioId);
    const planos = await findPlanos(tx, estagioId);
    const plano = planos.filter((item) => item.situacao === "APROVADO").at(-1) ?? planos.at(-1);
    if (!plano) {
      throw new DomainError({ code: "PLANO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "O estágio ainda não tem plano de atividades.", requisito: "RF016" });
    }
    return documentoPlano(plano, identificacao, plano.decididoPorUsuarioId ? await nomeDoUsuario(tx, plano.decididoPorUsuarioId) : null);
  });
  return gerarPdfDocumento(documento);
}

/** RF063, RF064: the termination term; whoever cannot read the termination gets not found. */
export async function pdfRescisao(identity: Identity, estagioId: string): Promise<Uint8Array> {
  const documento = await withUser(identity, async (tx) => {
    const { identificacao } = await carregar(tx, estagioId);
    const rescisao = await findRescisao(tx, estagioId);
    if (!rescisao) throw new DomainError({ code: "RESCISAO_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "O estágio não foi rescindido.", requisito: "RF063" });
    return documentoRescisao(rescisao, identificacao, await nomeDoUsuario(tx, rescisao.decididoPorUsuarioId));
  });
  return gerarPdfDocumento(documento);
}

export async function pdfAditivo(identity: Identity, aditivoId: string): Promise<Uint8Array> {
  const documento = await withUser(identity, async (tx) => {
    const aditivo = await findAditivoById(tx, aditivoId);
    if (!aditivo) throw new DomainError({ code: "ADITIVO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Aditivo não encontrado.", requisito: "RF020" });
    const { identificacao } = await carregar(tx, aditivo.estagioId);
    const novoSupervisor = aditivo.novoSupervisorUsuarioId ? await nomeDoUsuario(tx, aditivo.novoSupervisorUsuarioId) : null;
    return documentoAditivo(aditivo, identificacao, novoSupervisor, await findAssinaturas(tx, aditivo.estagioId));
  });
  return gerarPdfDocumento(documento);
}
