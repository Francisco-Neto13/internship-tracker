import { authenticatedRoute, dataResponse } from "@/lib/api";
import { complementacaoBodySchema, idParamSchema } from "@/modules/atividades/schemas/atividade";
import { complementarAtividade, getAtividade } from "@/modules/atividades/services/atividade-service";
import { analiseJson, atividadeJson, comprovanteJson } from "../../_atividades/json";

// RF049, RF055: the activity with its proofs and every analysis
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { atividade, comprovantes, analises } = await getAtividade(identity, id);
  return dataResponse({ ...atividadeJson(atividade), comprovantes: comprovantes.map(comprovanteJson), analises: analises.map(analiseJson) });
});

// RF055: while returned, the student corrects data, attaches and withdraws proofs
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = complementacaoBodySchema.parse(await request.json());
  await complementarAtividade(identity, id, body);
  const { atividade, comprovantes, analises } = await getAtividade(identity, id);
  return dataResponse({ ...atividadeJson(atividade), comprovantes: comprovantes.map(comprovanteJson), analises: analises.map(analiseJson) });
});
