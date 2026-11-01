import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { ativarEstagio } from "@/modules/estagios/services/estagio-service";
import { estagioJson } from "../../json";

// EM_FORMALIZACAO -> ATIVO: every guard checked at once; 409 ATIVACAO_BLOQUEADA lists them all
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(estagioJson(await ativarEstagio(identity, id)));
});
