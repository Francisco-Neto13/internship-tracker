import { randomUUID } from "node:crypto";
import { isRlsViolation } from "@/db/errors";
import { TAMANHO_MAXIMO_BYTES, TIPOS_MIME_PERMITIDOS } from "@/db/schema";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { getArmazenamento } from "./armazenamento";
import { extensaoDoTipo, sha256Hex, tipoPeloConteudo } from "./conteudo";
import {
  findAcessosDocumento,
  findDocumentoById,
  insertDocumento,
  podeConsultarAcessosDocumento,
  podeEnviarDocumento,
  registrarLeituraDocumento,
  type DocumentoRow,
  type TipoDocumento,
} from "./documento-repository";
import { assinarPedido, verificarPedido } from "./token-upload";

// D8 (DER-LOGICO §9.2): upload straight to the bucket by a signed PUT URL (Vercel functions
// refuse bodies above 4.5 MB), then a confirmation in which the server checks the stored
// object (size, type by its first bytes, SHA-256) before the documento row exists. Objects
// wait under pendentes/ and only reach documentos/ when confirmed, so a retention lock on
// documentos/ never holds a rejected file.

const VALIDADE_URL_ENVIO_SEGUNDOS = 5 * 60;
const VALIDADE_PEDIDO_MS = 15 * 60 * 1000;
const VALIDADE_URL_LEITURA_SEGUNDOS = 60;
const TIPOS_SENSIVEIS: readonly TipoDocumento[] = ["ATESTADO_AFASTAMENTO", "DISPENSA_DURACAO"];

export type EscopoDocumento = {
  tipo: TipoDocumento;
  concedenteId: string | null;
  estagioId: string | null;
  estudanteId: string | null;
};

const uploadInvalido = (code: string, message: string) => new DomainError({ code, kind: "UNPROCESSABLE", message, requisito: "RF050" });

export async function solicitarUpload(
  identity: Identity,
  input: EscopoDocumento & { tipoMime: string; tamanhoBytes: number; sha256: string; nomeOriginal: string },
) {
  if (!(TIPOS_MIME_PERMITIDOS as readonly string[]).includes(input.tipoMime)) {
    throw uploadInvalido("TIPO_ARQUIVO_NAO_PERMITIDO", "Envie PDF, JPEG ou PNG.");
  }
  if (input.tamanhoBytes <= 0 || input.tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    throw uploadInvalido("ARQUIVO_GRANDE_DEMAIS", "O arquivo pode ter no máximo 10 MiB.");
  }
  const pode = await withUser(identity, (tx) => podeEnviarDocumento(tx, input));
  if (!pode) {
    throw new DomainError({
      code: "ACESSO_NEGADO",
      kind: "FORBIDDEN",
      message: "O perfil atual não permite enviar este documento.",
      requisito: "RF003",
    });
  }

  const chavePendente = `pendentes/${randomUUID()}.${extensaoDoTipo(input.tipoMime)}`;
  const url = await getArmazenamento().urlEnvio(chavePendente, input.tipoMime, input.tamanhoBytes, VALIDADE_URL_ENVIO_SEGUNDOS);
  const expiraEm = Date.now() + VALIDADE_PEDIDO_MS;
  const uploadId = assinarPedido({
    usuarioId: identity.userId,
    chavePendente,
    tipo: input.tipo,
    tipoMime: input.tipoMime,
    tamanhoBytes: input.tamanhoBytes,
    sha256: input.sha256.toLowerCase(),
    nomeOriginal: input.nomeOriginal,
    concedenteId: input.concedenteId,
    estagioId: input.estagioId,
    estudanteId: input.estudanteId,
    sensivel: TIPOS_SENSIVEIS.includes(input.tipo),
    expiraEm,
  });
  return { uploadId, url, expiraEm: new Date(expiraEm), cabecalhos: { "Content-Type": input.tipoMime, "Content-Length": String(input.tamanhoBytes) } };
}

/**
 * Checks the object the client sent and records it. Any divergence removes the object:
 * a file that does not match what was authorized is never kept.
 */
export async function confirmarUpload(identity: Identity, uploadId: string): Promise<DocumentoRow> {
  const pedido = verificarPedido(uploadId, identity.userId);
  if (!pedido) throw uploadInvalido("UPLOAD_INVALIDO", "Pedido de envio inválido ou expirado. Solicite um novo.");

  const armazenamento = getArmazenamento();
  const tamanho = await armazenamento.tamanho(pedido.chavePendente);
  if (tamanho === null) throw uploadInvalido("UPLOAD_NAO_ENCONTRADO", "O arquivo ainda não foi enviado ou já foi confirmado.");

  const descartar = async (code: string, message: string): Promise<never> => {
    await armazenamento.remover(pedido.chavePendente);
    throw uploadInvalido(code, message);
  };
  if (tamanho !== pedido.tamanhoBytes || tamanho > TAMANHO_MAXIMO_BYTES) {
    return descartar("UPLOAD_DIVERGENTE", "O tamanho do arquivo enviado não confere com o declarado.");
  }
  const conteudo = await armazenamento.ler(pedido.chavePendente);
  if (tipoPeloConteudo(conteudo) !== pedido.tipoMime) {
    return descartar("UPLOAD_DIVERGENTE", "O conteúdo do arquivo não é do tipo declarado.");
  }
  if (sha256Hex(conteudo) !== pedido.sha256) {
    return descartar("UPLOAD_DIVERGENTE", "O hash do arquivo enviado não confere com o declarado.");
  }

  const chaveFinal = `documentos/${randomUUID()}.${extensaoDoTipo(pedido.tipoMime)}`;
  await armazenamento.copiar(pedido.chavePendente, chaveFinal);
  await armazenamento.remover(pedido.chavePendente);
  try {
    return await withUser(identity, (tx) =>
      insertDocumento(tx, {
        tipo: pedido.tipo as TipoDocumento,
        chaveObjeto: chaveFinal,
        nomeOriginal: pedido.nomeOriginal,
        tipoMime: pedido.tipoMime,
        tamanhoBytes: tamanho,
        sha256: pedido.sha256,
        sensivel: pedido.sensivel,
        concedenteId: pedido.concedenteId,
        estagioId: pedido.estagioId,
        estudanteId: pedido.estudanteId,
        enviadoPorUsuarioId: identity.userId,
      }),
    );
  } catch (error) {
    // The permission may have changed since the URL was signed; the object goes away with the row
    await armazenamento.remover(chaveFinal);
    if (isRlsViolation(error)) {
      throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: "O perfil atual não permite enviar este documento.", requisito: "RF003" });
    }
    throw error;
  }
}

/** Metadata plus a signed download URL valid for one minute (RNF-06, RF071). */
/**
 * RNF-06, RF071, RF072: metadata as RLS allows and a short signed URL when the caller may
 * download. For a sensitive document the read is recorded in the same transaction that
 * grants it, before the URL exists: no download without its trail.
 */
export async function obterDocumento(identity: Identity, id: string) {
  const { documento, podeBaixar } = await withUser(identity, async (tx) => {
    const documento = await findDocumentoById(tx, id);
    return { documento, podeBaixar: documento ? await registrarLeituraDocumento(tx, id) : false };
  });
  if (!documento) {
    throw new DomainError({ code: "DOCUMENTO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Documento não encontrado.", requisito: "RF050" });
  }
  const url = podeBaixar
    ? await getArmazenamento().urlLeitura(documento.chaveObjeto, documento.nomeOriginal, VALIDADE_URL_LEITURA_SEGUNDOS)
    : null;
  return { documento, url };
}

/** For services that attach a confirmed document: it exists, is visible and has this type and scope. */
export async function exigirDocumento(
  identity: Identity,
  id: string,
  esperado: Partial<EscopoDocumento> & { tipo: TipoDocumento },
): Promise<DocumentoRow> {
  const documento = await withUser(identity, (tx) => findDocumentoById(tx, id));
  const confere =
    documento &&
    documento.tipo === esperado.tipo &&
    (esperado.concedenteId === undefined || documento.concedenteId === esperado.concedenteId) &&
    (esperado.estagioId === undefined || documento.estagioId === esperado.estagioId);
  if (!confere) {
    throw new DomainError({
      code: "DOCUMENTO_INVALIDO",
      kind: "UNPROCESSABLE",
      message: `Informe um documento do tipo ${esperado.tipo} já enviado para este registro.`,
      requisito: "RF009",
    });
  }
  return documento;
}

/** RF073: who read a sensitive document (holder, coordination of the course, administrator). */
export async function listarAcessosDocumento(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    if (!(await findDocumentoById(tx, id))) {
      throw new DomainError({ code: "DOCUMENTO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Documento não encontrado.", requisito: "RF050" });
    }
    if (!(await podeConsultarAcessosDocumento(tx, id))) {
      throw new DomainError({
        code: "ACESSO_NEGADO",
        kind: "FORBIDDEN",
        message: "Só o titular, a coordenação do curso e o administrador consultam os acessos a documento sensível.",
        requisito: "RF073",
      });
    }
    return findAcessosDocumento(tx, id);
  });
}
