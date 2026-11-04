import { authenticatedRoute, dataResponse, SEM_CACHE, searchParamsOf } from "@/lib/api";
import { contasEstudanteQuerySchema } from "@/modules/acesso/schemas/usuario";
import { buscarContasEstudante } from "@/modules/acesso/services/usuario-service";

// RF005, issue #80: accounts to link when registering a student. Who may ask is decided by
// app.buscar_contas_estudante: any other profile receives an empty list.
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const { busca } = contasEstudanteQuerySchema.parse(searchParamsOf(request));
  return dataResponse(await buscarContasEstudante(identity, busca), { headers: SEM_CACHE });
});
