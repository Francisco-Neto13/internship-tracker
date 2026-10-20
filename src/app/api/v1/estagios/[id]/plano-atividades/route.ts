import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, planoBodySchema } from "@/modules/estagios/schemas/estagio";
import { listPlanos, registrarPlano } from "@/modules/estagios/services/formalizacao-service";
import { planoJson } from "../../json";

// RF016: every version, newest first (the approved one is the version in force)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listPlanos(identity, id)).map(planoJson));
});

// RF016: edits the draft, or creates a new version after a return or to replace the approved one
export const PUT = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = planoBodySchema.parse(await request.json());
  const plano = await registrarPlano(identity, id, {
    atividadesPrevistas: body.atividades_previstas,
    justificativaCompatibilidade: body.justificativa_compatibilidade,
  });
  return dataResponse(planoJson(plano));
});
