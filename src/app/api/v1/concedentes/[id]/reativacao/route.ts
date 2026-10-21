import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { alterarSituacaoConcedente } from "@/modules/concedentes/services/concedente-service";
import { concedenteJson } from "../../json";

// RF008: back to ATIVA, recorded in the situation history
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { concedente } = await alterarSituacaoConcedente(identity, id, "ATIVA", null);
  return dataResponse(concedenteJson(concedente));
});
