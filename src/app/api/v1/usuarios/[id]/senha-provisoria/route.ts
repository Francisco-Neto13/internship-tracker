import { authenticatedRoute, dataResponse, SEM_CACHE } from "@/lib/api";
import { idParamSchema } from "@/modules/acesso/schemas/usuario";
import { emitirSenhaProvisoria } from "@/modules/acesso/services/usuario-service";
import { usuarioJson } from "../../json";

// RF002: the administrator issues a new temporary password, returned once; the old
// password stops working and every session of the user ends
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { usuario, senhaProvisoria } = await emitirSenhaProvisoria(identity, id);
  return dataResponse({ ...usuarioJson(usuario), senha_provisoria: senhaProvisoria }, { headers: SEM_CACHE });
});
