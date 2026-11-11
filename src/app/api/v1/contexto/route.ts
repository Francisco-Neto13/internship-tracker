import { authenticatedRoute, dataResponse, SEM_CACHE } from "@/lib/api";
import { iniciarContextoBodySchema } from "@/modules/acesso/schemas/contexto";
import { contextoDaSessao, encerrarContexto, iniciarContexto } from "@/modules/acesso/services/contexto-service";
import { limparContexto, marcarContexto } from "./cookie";

// RF003: the administrator views the system as another account, read only. These routes act
// as the person signed in (comoTitular); every other route sees the account being viewed.

function contextoJson(contexto: Awaited<ReturnType<typeof contextoDaSessao>>) {
  return contexto ? { usuario: { id: contexto.usuarioId, nome: contexto.nome, email: contexto.email }, somente_leitura: true } : null;
}

export const GET = authenticatedRoute(
  async ({ identity, sessaoId }) => dataResponse(contextoJson(await contextoDaSessao(identity, sessaoId)), { headers: SEM_CACHE }),
  { comoTitular: true },
);

export const POST = authenticatedRoute(
  async ({ request, identity, sessaoId }) => {
    const body = iniciarContextoBodySchema.parse(await request.json());
    const contexto = await iniciarContexto(identity, sessaoId, body.usuario_id);
    return marcarContexto(dataResponse(contextoJson(contexto), { status: 201, headers: SEM_CACHE }));
  },
  { comoTitular: true },
);

export const DELETE = authenticatedRoute(
  async ({ identity, sessaoId }) => {
    await encerrarContexto(identity, sessaoId);
    return limparContexto(dataResponse(null, { headers: SEM_CACHE }));
  },
  { comoTitular: true },
);
