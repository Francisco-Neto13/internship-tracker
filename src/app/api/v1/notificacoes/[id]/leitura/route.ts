import { authenticatedRoute, dataResponse } from "@/lib/api";
import { lerNotificacao } from "@/shared/notificacoes/notificacao-service";
import { notificacaoIdParamSchema } from "@/shared/notificacoes/schemas";
import { notificacaoJson } from "../../../_notificacoes/json";

// RF070: marks one notification as read
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = notificacaoIdParamSchema.parse(params);
  return dataResponse(notificacaoJson(await lerNotificacao(identity, id)));
});
