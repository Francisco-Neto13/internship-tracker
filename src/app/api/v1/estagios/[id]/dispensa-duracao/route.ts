import { authenticatedRoute, dataResponse } from "@/lib/api";
import { dispensaBodySchema, idParamSchema } from "@/modules/estagios/schemas/estagio";
import { definirDispensaDuracao } from "@/modules/estagios/services/estagio-service";
import { estagioJson } from "../../json";

// D5, Lei 11.788/2008 art. 11: exemption from the 2-year limit (intern with a disability),
// with a sensitive DISPENSA_DURACAO document; documento_id null removes it
export const PUT = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { documento_id } = dispensaBodySchema.parse(await request.json());
  return dataResponse(estagioJson(await definirDispensaDuracao(identity, id, documento_id)));
});
