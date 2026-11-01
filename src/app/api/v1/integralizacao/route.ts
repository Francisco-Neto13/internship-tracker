import { authenticatedRoute, dataResponse } from "@/lib/api";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { integralizacaoJson } from "../_integralizacao/json";

// RF057, RN-24: the student's own progress, at any moment
export const GET = authenticatedRoute(async ({ identity }) => dataResponse(integralizacaoJson(await getMinhaIntegralizacao(identity))));
