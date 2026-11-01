import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, toConcedenteValues, updateConcedenteBodySchema } from "@/modules/concedentes/schemas/concedente";
import { getConcedente, updateConcedenteDados } from "@/modules/concedentes/services/concedente-service";
import { concedenteJson } from "../json";

export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(concedenteJson(await getConcedente(identity, id)));
});

// RF007, RF013: data and classification. A concedente representative changes only its
// contacts (403 ALTERACAO_RESTRITA_A_CONTATOS otherwise); situation changes through
// /suspensao and /reativacao, never here.
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateConcedenteBodySchema.parse(await request.json());
  return dataResponse(concedenteJson(await updateConcedenteDados(identity, id, toConcedenteValues(body))));
});
