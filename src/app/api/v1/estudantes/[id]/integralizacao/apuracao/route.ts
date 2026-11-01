import { authenticatedRoute, dataResponse } from "@/lib/api";
import { estudanteIdParamSchema } from "@/modules/integralizacao/schemas/integralizacao";
import { reapurar } from "@/modules/integralizacao/services/integralizacao-service";
import { integralizacaoJson } from "../../../../_integralizacao/json";

// RF056: stores a new assessment now (gatilho MANUAL), with the same calculation as the events
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = estudanteIdParamSchema.parse(params);
  return dataResponse(integralizacaoJson(await reapurar(identity, id)), { status: 201 });
});
