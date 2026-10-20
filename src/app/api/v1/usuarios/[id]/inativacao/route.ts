import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acesso/schemas/usuario";
import { inativarUsuario } from "@/modules/acesso/services/usuario-service";
import { usuarioJson } from "../../json";

// RF001: a state transition, not a field edit; never deletes the user (RN-28)
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(usuarioJson(await inativarUsuario(identity, id)));
});
