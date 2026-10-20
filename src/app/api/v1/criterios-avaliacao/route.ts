import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { criterioBodySchema, criteriosQuerySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { criarCriterio, listCriterios } from "@/modules/acompanhamento/services/avaliacao-service";
import { criterioJson } from "../_acompanhamento/json";

// RF042: criteria defined by the institution (active ones; ?incluir_inativos=true for all)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const { apenasAtivos } = criteriosQuerySchema.parse(searchParamsOf(request));
  return dataResponse((await listCriterios(identity, apenasAtivos)).map(criterioJson));
});

// RF042: the administrator creates a criterion with its scale
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = criterioBodySchema.parse(await request.json());
  return dataResponse(criterioJson(await criarCriterio(identity, body)), { status: 201 });
});
