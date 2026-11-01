import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

// D8: the upload is two steps (signed PUT URL, then confirmation). Between them the server
// keeps no state: the confirmation carries this token, an HMAC over what was authorized
// (who, which object key, declared type, size and hash, scope, expiry). Tampering with any
// field invalidates it. The key is derived from BETTER_AUTH_SECRET with HKDF, so no new
// secret is needed and the auth library's own uses of that secret are not reused.

export type PedidoUpload = {
  usuarioId: string;
  chavePendente: string;
  tipo: string;
  tipoMime: string;
  tamanhoBytes: number;
  sha256: string;
  nomeOriginal: string;
  concedenteId: string | null;
  estagioId: string | null;
  estudanteId: string | null;
  sensivel: boolean;
  expiraEm: number;
};

function chave(): Buffer {
  const segredo = process.env.BETTER_AUTH_SECRET;
  if (!segredo) throw new Error("BETTER_AUTH_SECRET não definido");
  return Buffer.from(hkdfSync("sha256", segredo, "internship-tracker", "upload-de-documento", 32));
}

export function assinarPedido(pedido: PedidoUpload): string {
  const corpo = Buffer.from(JSON.stringify(pedido)).toString("base64url");
  const assinatura = createHmac("sha256", chave()).update(corpo).digest("base64url");
  return `${corpo}.${assinatura}`;
}

/** The request the token authorizes, or null when it was altered, expired or is not the caller's. */
export function verificarPedido(token: string, usuarioId: string, agora = Date.now()): PedidoUpload | null {
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  const esperada = createHmac("sha256", chave()).update(corpo).digest();
  const recebida = Buffer.from(assinatura, "base64url");
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;
  try {
    const pedido = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as PedidoUpload;
    if (pedido.usuarioId !== usuarioId || pedido.expiraEm < agora) return null;
    return pedido;
  } catch {
    return null;
  }
}
