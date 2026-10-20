import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, replacePerfisBodySchema, toVinculos } from "@/modules/acesso/schemas/usuario";
import { substituirPerfis } from "@/modules/acesso/services/usuario-service";
import { vinculoJson } from "../../json";

// RF001, RF003: replaces the links in force; removed links are closed, never deleted
export const PUT = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = replacePerfisBodySchema.parse(await request.json());
  const vigentes = await substituirPerfis(identity, id, toVinculos(body.perfis));
  return dataResponse(vigentes.map(vinculoJson));
});
