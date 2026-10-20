import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, updateUsuarioBodySchema } from "@/modules/acesso/schemas/usuario";
import { getUsuario, updateUsuarioDados } from "@/modules/acesso/services/usuario-service";
import { usuarioJson, vinculoJson } from "../json";

// RF001: detail with the links in force and the full link history (closed links included)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const usuario = await getUsuario(identity, id);
  return dataResponse({ ...usuarioJson(usuario), historico_perfis: usuario.historico.map(vinculoJson) });
});

export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateUsuarioBodySchema.parse(await request.json());
  const usuario = await updateUsuarioDados(identity, id, { nome: body.nome, email: body.email });
  return dataResponse(usuarioJson(usuario));
});
