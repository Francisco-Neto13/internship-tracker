import { authenticatedRoute, dataResponse } from "@/lib/api";
import { estudanteIdParamSchema, toEstudanteValues, updateEstudanteBodySchema } from "@/modules/academico/schemas/estudante";
import { getEstudante, updateEstudanteDados } from "@/modules/academico/services/estudante-service";
import { estudanteJson } from "../json";

// RF005: 404 both for a student that does not exist and for one outside the caller's scope
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = estudanteIdParamSchema.parse(params);
  return dataResponse(estudanteJson(await getEstudante(identity, id)));
});

export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = estudanteIdParamSchema.parse(params);
  const body = updateEstudanteBodySchema.parse(await request.json());
  return dataResponse(estudanteJson(await updateEstudanteDados(identity, id, toEstudanteValues(body))));
});
