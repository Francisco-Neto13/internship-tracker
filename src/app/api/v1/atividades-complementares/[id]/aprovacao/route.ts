import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/atividades/schemas/atividade";
import { decidirAtividade } from "@/modules/atividades/services/atividade-service";
import { analiseJson, atividadeJson } from "../../../_atividades/json";

// RF051, RF054: approves; the answer tells the hours counted and the excess not counted
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { analise, atividade } = await decidirAtividade(identity, id, "APROVADA", null);
  return dataResponse({ ...atividadeJson(atividade), analise: analiseJson(analise) }, { status: 201 });
});
