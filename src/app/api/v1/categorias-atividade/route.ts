import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createCategoriaBodySchema, listCategoriasQuerySchema } from "@/modules/academico/schemas/parametros";
import { createCategoria, listCategorias } from "@/modules/academico/services/categoria-service";
import { categoriaJson } from "./json";

// RF048, RN-19: categories of complementary activities; inactive ones only on request
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listCategoriasQuerySchema.parse(searchParamsOf(request));
  const itens = await listCategorias(identity, { incluirInativas: query.incluir_inativas });
  return dataResponse(itens.map(categoriaJson));
});

export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createCategoriaBodySchema.parse(await request.json());
  const criada = await createCategoria(identity, { nome: body.nome, descricao: body.descricao ?? null });
  return dataResponse(categoriaJson(criada), { status: 201 });
});
