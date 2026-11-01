import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { fecharTce } from "@/modules/estagios/services/estagio-service";
import { estagioJson } from "../../../json";

// D9, RF019, RNF-08: freezes the TCE content and records the SHA-256 the parties sign
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(estagioJson(await fecharTce(identity, id)));
});
