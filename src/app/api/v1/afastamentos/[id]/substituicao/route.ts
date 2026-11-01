import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, substituicaoAfastamentoBodySchema, toNovoAfastamento } from "@/modules/estagios/schemas/estagio";
import { substituirAfastamento } from "@/modules/estagios/services/afastamento-service";
import { afastamentoJson } from "../../../estagios/json";

// RN-28: a leave is corrected by a new row that replaces it, never overwritten
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = substituicaoAfastamentoBodySchema.parse(await request.json());
  return dataResponse(afastamentoJson(await substituirAfastamento(identity, id, toNovoAfastamento(body), body.justificativa)), { status: 201 });
});
