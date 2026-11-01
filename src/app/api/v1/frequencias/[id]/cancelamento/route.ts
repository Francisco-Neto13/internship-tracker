import { authenticatedRoute, dataResponse } from "@/lib/api";
import { cancelamentoBodySchema, idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { cancelarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { frequenciaJson } from "../../../_acompanhamento/json";

// RF029: removes a day not homologated; the entry stays as CANCELADO with the reason
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { justificativa } = cancelamentoBodySchema.parse(await request.json());
  return dataResponse(frequenciaJson(await cancelarFrequencia(identity, id, justificativa)));
});
