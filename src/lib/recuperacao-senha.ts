import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import { solicitarRecuperacaoSenha } from "@/db/rotinas";
import { LIMITE } from "./campos";

// RF002: "esqueceu a senha" without e-mail. The request only warns the administrators inside the
// system; they confirm who is asking and hand over a temporary password. A plugin of the auth
// library so the route gets its database rate limit, keyed by the trusted client address.
// The answer never changes with the account, so nobody can find out which e-mails exist.

const POR_MINUTO = 3;

export function recuperacaoSenha(): BetterAuthPlugin {
  return {
    id: "recuperacao-senha",
    endpoints: {
      solicitarRecuperacaoSenha: createAuthEndpoint(
        "/recuperacao-senha",
        { method: "POST", body: z.object({ email: z.email().max(LIMITE.email) }) },
        async (ctx) => {
          await solicitarRecuperacaoSenha(ctx.body.email);
          return ctx.json({ recebido: true });
        },
      ),
    },
    rateLimit: [{ pathMatcher: (caminho) => caminho === "/recuperacao-senha", window: 60, max: POR_MINUTO }],
  };
}
