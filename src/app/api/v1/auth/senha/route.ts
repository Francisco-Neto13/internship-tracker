import { authenticatedRoute, dataResponse } from "@/lib/api";
import { getSession } from "@/lib/session";
import { trocarSenhaBodySchema } from "@/modules/acesso/schemas/senha";
import { trocarSenha } from "@/modules/acesso/services/senha-service";

// RF002: the signed-in user replaces their password. Reachable during a pending change,
// which is the point; the session cookie is reissued and every other session ends.
export const POST = authenticatedRoute(
  async ({ request, identity }) => {
    const body = trocarSenhaBodySchema.parse(await request.json());
    const session = await getSession();
    await trocarSenha(identity, session!.user, request.headers, {
      senhaAtual: body.senha_atual,
      novaSenha: body.nova_senha,
    });
    return dataResponse({ troca_senha_obrigatoria: false });
  },
  { permitirTrocaSenhaPendente: true },
);
