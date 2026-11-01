import { authenticatedRoute, dataResponse } from "@/lib/api";
import { analiseDivergenciaBodySchema, idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { analisarDivergencia } from "@/modules/acompanhamento/services/frequencia-service";
import { divergenciaJson } from "../../../_acompanhamento/json";

// RF028, RN-09: the advisor analyzes the divergence, which closes the case
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parecer } = analiseDivergenciaBodySchema.parse(await request.json());
  return dataResponse(divergenciaJson(await analisarDivergencia(identity, id, parecer)));
});
