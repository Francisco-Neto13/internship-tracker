import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

// RF002, NIST SP 800-63B-4 3.1.1.2: new passwords are compared against breach corpora.
// Same behaviour as Better Auth's haveIBeenPwned plugin (k-anonymity range lookup with
// only the first 5 hex characters of the SHA-1 leaving the server, padded response, fail
// closed), with the endpoint configurable: the e2e production build talks to a local stub
// instead of the real service (src/lib/auth-options.ts, e2e/support/hibp-stub.mjs).
// It runs as a before hook, which covers HTTP calls and server-side auth.api calls alike.

const CAMINHOS_VERIFICADOS = new Set(["/change-password", "/reset-password", "/sign-up/email"]);

async function sha1Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return Buffer.from(digest).toString("hex").toUpperCase();
}

/** Count for `sufixo` in a range response ("SUFFIX:COUNT" lines); padding lines have count 0. */
export function contagemNoRange(resposta: string, sufixo: string): number {
  const prefixo = `${sufixo.toUpperCase()}:`;
  for (const linha of resposta.split(/\r?\n/)) {
    if (linha.slice(0, prefixo.length).toUpperCase() !== prefixo) continue;
    const contagem = Number(linha.slice(prefixo.length).trim());
    if (!Number.isSafeInteger(contagem) || contagem < 0) throw new Error("Contagem inválida na resposta");
    return contagem;
  }
  return 0;
}

export async function senhaComprometida(senha: string, urlRange: string): Promise<boolean> {
  const hash = await sha1Hex(senha);
  let corpo: string;
  try {
    const resposta = await fetch(`${urlRange}${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Internship Tracker password checker" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) throw new Error(`status ${resposta.status}`);
    corpo = await resposta.text();
    return contagemNoRange(corpo, hash.slice(5)) > 0;
  } catch {
    throw new APIError("INTERNAL_SERVER_ERROR", { message: "Failed to check password. Please try again later." });
  }
}

type Opcoes = {
  /** Read on every check, so tests and configuration changes apply without a restart. */
  readonly ativa: boolean;
  readonly urlRange: string;
  readonly mensagem: string;
};

export function senhasVazadas(opcoes: Opcoes) {
  return {
    id: "senhas-vazadas",
    hooks: {
      before: [
        {
          matcher: (ctx) => CAMINHOS_VERIFICADOS.has(ctx.path ?? ""),
          handler: createAuthMiddleware(async (ctx) => {
            if (!opcoes.ativa) return;
            const body = (ctx.body ?? {}) as { newPassword?: unknown; password?: unknown };
            const senha = typeof body.newPassword === "string" ? body.newPassword : body.password;
            if (typeof senha !== "string" || senha.length === 0) return;
            if (await senhaComprometida(senha, opcoes.urlRange)) {
              throw new APIError("BAD_REQUEST", { message: opcoes.mensagem, code: "PASSWORD_COMPROMISED" });
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
