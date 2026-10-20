import { authenticatedRoute, dataResponse } from "@/lib/api";
import { updateCategoriaBodySchema, uuidParamSchema } from "@/modules/academico/schemas/parametros";
import { updateCategoriaDados } from "@/modules/academico/services/categoria-service";
import { categoriaJson } from "../json";

// RF048: rename or deactivate; a category is never deleted
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = uuidParamSchema.parse(params);
  const body = updateCategoriaBodySchema.parse(await request.json());
  return dataResponse(categoriaJson(await updateCategoriaDados(identity, id, body)));
});
