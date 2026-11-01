import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, justificativaBodySchema } from "@/modules/estagios/schemas/estagio";
import { reabrirTce } from "@/modules/estagios/services/estagio-service";
import { estagioJson } from "../../../json";

// D9: back to edition with a reason; signatures collected stay but stop counting if the content changes
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { justificativa } = justificativaBodySchema.parse(await request.json());
  return dataResponse(estagioJson(await reabrirTce(identity, id, justificativa)));
});
