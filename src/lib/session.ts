import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
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

export type ResolvedSession = { identity: Identity; user: SessionUser };

/**
 * The only place an Identity is produced (RF002, RN-37). Inactive users resolve to
 * null even if a session row survived, so their queries never reach the database.
 * A pending password change still resolves: callers decide what stays reachable
 * (authenticatedRoute in src/lib/api.ts, getIdentity below).
 */
export async function resolveSession(requestHeaders: Headers): Promise<ResolvedSession | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || session.user.situacao !== "ATIVO") return null;

  return {
    identity: { userId: session.user.id } as Identity,
    user: {
      id: session.user.id,
      nome: session.user.name,
      email: session.user.email,
      trocaSenhaObrigatoria: session.user.trocaSenhaObrigatoria === true,
      senhaProvisoriaExpiraEm: session.user.senhaProvisoriaExpiraEm ?? null,
    },
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
