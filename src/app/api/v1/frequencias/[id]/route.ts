import { authenticatedRoute, dataResponse } from "@/lib/api";
import { ajusteBodySchema, idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { ajustarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { frequenciaJson } from "../../_acompanhamento/json";

// RF029: correction with reason; answers with the new entry, which replaces this one (kept)
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = ajusteBodySchema.parse(await request.json());
  return dataResponse(frequenciaJson(await ajustarFrequencia(identity, id, body)), { status: 201 });
});
