import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { contextoDaSessao } from "@/modules/acesso/services/contexto-service";
import { getAuth } from "./auth";
import type { Identity } from "./identity";

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  /** RF002: a temporary password is in use and must be replaced before anything else. */
  trocaSenhaObrigatoria: boolean;
  senhaProvisoriaExpiraEm: Date | null;
};

/** RF003: set while an administrator views the system as another account. */
export type ContextoDaSessao = { nomeTitular: string };

export type ResolvedSession = {
  /** Who the request acts as: the account switched to while a switch is open. */
  identity: Identity;
  user: SessionUser;
  /** The person signed in. Differs from identity only during a switch (RF003). */
  titular: Identity;
  sessaoId: string;
  contexto: ContextoDaSessao | null;
};

/**
 * Hint that this browser opened a switch, so other sessions skip the lookup. Only a hint: the
 * switch itself is the row in contexto_administrador, read again on every request.
 */
export const COOKIE_CONTEXTO = "contexto-perfil";

function temCookieContexto(requestHeaders: Headers): boolean {
  return (requestHeaders.get("cookie") ?? "").split(";").some((parte) => parte.trim().startsWith(`${COOKIE_CONTEXTO}=`));
}

/**
 * The only place an Identity is produced (RF002, RN-37). Inactive users resolve to
 * null even if a session row survived, so their queries never reach the database.
 * A pending password change still resolves: callers decide what stays reachable
 * (authenticatedRoute in src/lib/api.ts, getIdentity below).
 */
export async function resolveSession(requestHeaders: Headers): Promise<ResolvedSession | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || session.user.situacao !== "ATIVO") return null;

  const titular = { userId: session.user.id } as Identity;
  const proprio: ResolvedSession = {
    identity: titular,
    titular,
    sessaoId: session.session.id,
    contexto: null,
    user: {
      id: session.user.id,
      nome: session.user.name,
      email: session.user.email,
      trocaSenhaObrigatoria: session.user.trocaSenhaObrigatoria === true,
      senhaProvisoriaExpiraEm: session.user.senhaProvisoriaExpiraEm ?? null,
    },
  };
  if (proprio.user.trocaSenhaObrigatoria || !temCookieContexto(requestHeaders)) return proprio;

  // RF003: the switch holds only while the session's owner is an administrator in force
  const aberto = await contextoDaSessao(titular, proprio.sessaoId);
  if (!aberto) return proprio;
  return {
    ...proprio,
    identity: { userId: aberto.usuarioId, titularId: titular.userId } as Identity,
    contexto: { nomeTitular: proprio.user.nome },
    user: { id: aberto.usuarioId, nome: aberto.nome, email: aberto.email, trocaSenhaObrigatoria: false, senhaProvisoriaExpiraEm: null },
  };
}

// Deduplicated per request: layout, page and route handler share one lookup
export const getSession = cache(async (): Promise<ResolvedSession | null> => resolveSession(await headers()));

/**
 * Identity for server components. With a temporary password still in use it redirects to
 * the change screen (RF002): layout and page render concurrently, so the page cannot rely
 * on the layout's redirect to keep it from reading data.
 */
export async function getIdentity(): Promise<Identity | null> {
  const session = await getSession();
  if (session?.user.trocaSenhaObrigatoria) redirect("/trocar-senha");
  return session?.identity ?? null;
}
