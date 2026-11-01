import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { contarNaoLidas, findNotificacoes, marcarLida, marcarTodasLidas } from "./notificacao-repository";

// RF070: in-system notifications (no e-mail, closed decision). They are written by the
// database (events by trigger, deadlines by the daily routine); here the recipient reads them.

export async function listNotificacoes(identity: Identity, filtro: { apenasNaoLidas: boolean; limite: number }) {
  return withUser(identity, async (tx) => ({
    itens: await findNotificacoes(tx, filtro.apenasNaoLidas, filtro.limite),
    naoLidas: await contarNaoLidas(tx),
  }));
}

export async function lerNotificacao(identity: Identity, id: string) {
  const lida = await withUser(identity, (tx) => marcarLida(tx, id));
  if (!lida) {
    throw new DomainError({ code: "NOTIFICACAO_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Notificação não encontrada ou já lida.", requisito: "RF070" });
  }
  return lida;
}

export async function lerTodas(identity: Identity) {
  return withUser(identity, (tx) => marcarTodasLidas(tx));
}
