import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { decidirPlano } from "@/modules/estagios/services/formalizacao-service";
import { planoJson } from "../../../json";

// RF017: only the advisor of the internship approves
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(planoJson(await decidirPlano(identity, id, "APROVADO", null)));
});
