import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/atividades/schemas/atividade";
import { reenviarAtividade } from "@/modules/atividades/services/atividade-service";
import { atividadeJson } from "../../../_atividades/json";

// RF055: DEVOLVIDA -> EM_ANALISE, keeping the history of analyses
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(atividadeJson(await reenviarAtividade(identity, id)));
});
