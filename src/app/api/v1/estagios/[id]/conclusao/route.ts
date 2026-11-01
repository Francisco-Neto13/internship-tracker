import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { concluirEstagio } from "@/modules/estagios/services/encerramento-service";
import { estagioJson } from "../../json";

// RF045, RF043: ATIVO -> CONCLUIDO; 409 CONCLUSAO_BLOQUEADA lists every impediment at once
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(estagioJson(await concluirEstagio(identity, id)));
});
