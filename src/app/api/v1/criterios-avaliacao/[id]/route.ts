import { authenticatedRoute, dataResponse } from "@/lib/api";
import { alterarCriterioBodySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { alterarCriterio } from "@/modules/acompanhamento/services/avaliacao-service";
import { criterioJson } from "../../_acompanhamento/json";

// RF042: order and activation always; description and scale only while never answered
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = alterarCriterioBodySchema.parse(await request.json());
  return dataResponse(criterioJson(await alterarCriterio(identity, id, body)));
});
