import { authenticatedRoute, dataResponse } from "@/lib/api";
import { aditivoBodySchema, idParamSchema, toNovoAditivo } from "@/modules/estagios/schemas/estagio";
import { criarAditivo, listAditivos } from "@/modules/estagios/services/aditivo-service";
import { aditivoJson } from "../../json";

// RF020, RF021: amendments of the internship
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listAditivos(identity, id)).map(aditivoJson));
});

// RF020, RF061, RF062: coordination proposes; effective with the three signatures
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = aditivoBodySchema.parse(await request.json());
  return dataResponse(aditivoJson(await criarAditivo(identity, id, toNovoAditivo(body))), { status: 201 });
});
