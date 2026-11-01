import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, motivoBodySchema } from "@/modules/atividades/schemas/atividade";
import { decidirAtividade } from "@/modules/atividades/services/atividade-service";
import { analiseJson, atividadeJson } from "../../../_atividades/json";

// RF054, RF055: returns for complementation, saying what is missing
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { motivo } = motivoBodySchema.parse(await request.json());
  const { analise, atividade } = await decidirAtividade(identity, id, "DEVOLVIDA", motivo);
  return dataResponse({ ...atividadeJson(atividade), analise: analiseJson(analise) }, { status: 201 });
});
