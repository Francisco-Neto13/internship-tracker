import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { contasContextoQuerySchema } from "@/modules/acesso/schemas/contexto";
import { listContasParaContexto } from "@/modules/acesso/services/contexto-service";

// RF003: accounts the administrator may view the system as, with their profiles in force
export const GET = authenticatedRoute(
  async ({ request, identity }) => {
    const query = contasContextoQuerySchema.parse(searchParamsOf(request));
    const contas = await listContasParaContexto(identity, { busca: query.busca, perfil: query.perfil, limite: query.limit });
    return dataResponse(contas);
  },
  { comoTitular: true },
);
