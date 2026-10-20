import { authenticatedRoute, dataResponse } from "@/lib/api";
import { acompanhamentoBodySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listAcompanhamentos, registrarAcompanhamento } from "@/modules/acompanhamento/services/avaliacao-service";
import { acompanhamentoJson } from "../../../_acompanhamento/json";

// RF033: visits, contacts and meetings (advisor and coordination)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listAcompanhamentos(identity, id)).map(acompanhamentoJson));
});

// RF033, RN-11: the advisor records one that already happened
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = acompanhamentoBodySchema.parse(await request.json());
  return dataResponse(acompanhamentoJson(await registrarAcompanhamento(identity, id, body)), { status: 201 });
});
