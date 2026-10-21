import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, responsavelBodySchema } from "@/modules/estagios/schemas/estagio";
import { listResponsaveis, vincularResponsavel } from "@/modules/estagios/services/formalizacao-service";
import { responsavelJson } from "../../json";

// RF031, RF034: responsible people with history (annulled designations included)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listResponsaveis(identity, id)).map(responsavelJson));
});

// RF031: binds advisor or supervisor during formalization (coordination of the course)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = responsavelBodySchema.parse(await request.json());
  return dataResponse(responsavelJson(await vincularResponsavel(identity, id, body.papel, body.usuario_id)), { status: 201 });
});
