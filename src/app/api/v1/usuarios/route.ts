import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createUsuarioBodySchema, listUsuariosQuerySchema, toVinculos } from "@/modules/acesso/schemas/usuario";
import { createUsuario, listUsuarios } from "@/modules/acesso/services/usuario-service";
import { usuarioJson } from "./json";

// RF001: listing comes filtered by RLS (the administrator sees everyone, coordination the
// users of its students, anyone else only themselves)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listUsuariosQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listUsuarios(identity, query);
  return dataResponse(items.map(usuarioJson), { meta: { total, page: query.page, limit: query.limit } });
});

// RF001, RF002: the temporary password is returned once and never stored in clear
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createUsuarioBodySchema.parse(await request.json());
  const { usuario, senhaProvisoria } = await createUsuario(identity, {
    nome: body.nome,
    email: body.email,
    perfis: toVinculos(body.perfis),
  });
  return dataResponse({ ...usuarioJson(usuario), senha_provisoria: senhaProvisoria }, { status: 201 });
});
