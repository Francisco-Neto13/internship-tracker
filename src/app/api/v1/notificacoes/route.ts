import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { notificacoesQuerySchema } from "@/shared/notificacoes/schemas";
import { notificacaoJson } from "../_notificacoes/json";

// RF070: the caller's notifications, newest first, with the unread count
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const filtro = notificacoesQuerySchema.parse(searchParamsOf(request));
  const { itens, naoLidas } = await listNotificacoes(identity, filtro);
  return dataResponse(itens.map(notificacaoJson), { meta: { nao_lidas: naoLidas } });
});
