import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acesso/schemas/usuario";
import { reativarUsuario } from "@/modules/acesso/services/usuario-service";
import { usuarioJson } from "../../json";

// RF001: undoes an inactivation. Without it a mistaken inactivation would be permanent,
// since the e-mail cannot be reused by a new account.
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(usuarioJson(await reativarUsuario(identity, id)));
});
