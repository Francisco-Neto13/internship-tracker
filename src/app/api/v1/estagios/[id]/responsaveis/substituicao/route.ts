import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, substituicaoOrientadorBodySchema } from "@/modules/estagios/schemas/estagio";
import { substituirOrientador } from "@/modules/estagios/services/formalizacao-service";
import { responsavelJson } from "../../../json";

// RF034, RN-12: replaces the advisor of an active internship with reason and author. The
// supervisor is replaced by amendment (RN-06): POST /estagios/{id}/aditivos SUBSTITUICAO_SUPERVISOR
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = substituicaoOrientadorBodySchema.parse(await request.json());
  return dataResponse(responsavelJson(await substituirOrientador(identity, id, body.usuario_id, body.motivo)), { status: 201 });
});
