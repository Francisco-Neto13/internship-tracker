import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listDivergencias } from "@/modules/acompanhamento/services/frequencia-service";
import { divergenciaJson } from "../../../_acompanhamento/json";

// RF028: divergence cases of the internship, open and analyzed
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listDivergencias(identity, id)).map(divergenciaJson));
});
