import { authenticatedRoute, dataResponse, SEM_CACHE, searchParamsOf } from "@/lib/api";
import { contasResponsavelQuerySchema, idParamSchema } from "@/modules/estagios/schemas/estagio";
import { buscarContasResponsavel } from "@/modules/estagios/services/formalizacao-service";

// RF031: accounts to bind as advisor or supervisor. Who may ask is decided by
// app.buscar_contas_responsavel: anyone but the coordination of the course receives an empty list.
export const GET = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { papel, busca } = contasResponsavelQuerySchema.parse(searchParamsOf(request));
  return dataResponse(await buscarContasResponsavel(identity, id, papel, busca), { headers: SEM_CACHE });
});
