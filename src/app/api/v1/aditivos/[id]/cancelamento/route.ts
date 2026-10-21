import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, motivoBodySchema } from "@/modules/estagios/schemas/estagio";
import { cancelarAditivoPendente } from "@/modules/estagios/services/aditivo-service";
import { aditivoJson } from "../../../estagios/json";

// RF020: a pending amendment is cancelled with a reason, never deleted
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { motivo } = motivoBodySchema.parse(await request.json());
  return dataResponse(aditivoJson(await cancelarAditivoPendente(identity, id, motivo)));
});
