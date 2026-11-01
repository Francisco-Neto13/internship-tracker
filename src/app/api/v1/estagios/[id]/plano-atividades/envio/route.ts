import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { submeterPlano } from "@/modules/estagios/services/formalizacao-service";
import { planoJson } from "../../../json";

// RF017: the draft goes to the advisor; content frozen from here on
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(planoJson(await submeterPlano(identity, id)));
});
