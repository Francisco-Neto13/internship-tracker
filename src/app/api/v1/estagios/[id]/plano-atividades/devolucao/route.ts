import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, parecerBodySchema } from "@/modules/estagios/schemas/estagio";
import { decidirPlano } from "@/modules/estagios/services/formalizacao-service";
import { planoJson } from "../../../json";

// RF017: the advisor returns the plan with an opinion; a new version follows
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parecer } = parecerBodySchema.parse(await request.json());
  return dataResponse(planoJson(await decidirPlano(identity, id, "DEVOLVIDO", parecer)));
});
