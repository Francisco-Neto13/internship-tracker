import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { getFormularioAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { criterioJson } from "../../../../_acompanhamento/json";

// RF042: the active criteria the evaluation must answer
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await getFormularioAvaliacao(identity, id)).map(criterioJson));
});
