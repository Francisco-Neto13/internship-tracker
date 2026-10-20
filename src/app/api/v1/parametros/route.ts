import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { dataQuerySchema, definirParametrosBodySchema, toParametros } from "@/modules/academico/schemas/parametros";
import { definirParametros, getParametrosVigentes } from "@/modules/academico/services/parametro-service";
import { parametrosJson } from "./json";

// RF006: parameters in force on a date (today by default). `origem` tells an institutional
// version from the legal defaults used until the administrator records one.
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const { data } = dataQuerySchema.parse(searchParamsOf(request));
  return dataResponse(parametrosJson(await getParametrosVigentes(identity, data)));
});

// RF006: a new version, never retroactive; the previous ones stay for the past
export const PUT = authenticatedRoute(async ({ request, identity }) => {
  const body = definirParametrosBodySchema.parse(await request.json());
  return dataResponse(parametrosJson(await definirParametros(identity, toParametros(body))), { status: 201 });
});
