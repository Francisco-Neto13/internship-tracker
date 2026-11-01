import { authenticatedRoute, dataResponse } from "@/lib/api";
import { estudanteIdParamSchema } from "@/modules/integralizacao/schemas/integralizacao";
import { getIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { integralizacaoJson } from "../../../_integralizacao/json";

// RF056, RF057: the assessment in force of a student the caller follows (the student or its coordination)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = estudanteIdParamSchema.parse(params);
  return dataResponse(integralizacaoJson(await getIntegralizacao(identity, id)));
});
