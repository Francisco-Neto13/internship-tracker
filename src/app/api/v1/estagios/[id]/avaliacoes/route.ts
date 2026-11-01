import { authenticatedRoute, dataResponse } from "@/lib/api";
import { avaliacaoBodySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listAvaliacoes, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { avaliacaoJson } from "../../../_acompanhamento/json";

// RF042: evaluations of the internship, with the grades and the normalized average
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listAvaliacoes(identity, id)).map(avaliacaoJson));
});

// RF042, RF043: the supervisor or the concedente evaluates, giving a grade to every active criterion
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = avaliacaoBodySchema.parse(await request.json());
  return dataResponse(avaliacaoJson(await registrarAvaliacao(identity, id, body)), { status: 201 });
});
