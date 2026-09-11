import { headers } from "next/headers";
import { cache } from "react";
import { getAuth } from "./auth";
import type { Identity } from "./identity";

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
};

type ResolvedSession = { identity: Identity; user: SessionUser };

/**
 * The only place an Identity is produced (RF002, RN-37). Inactive users resolve to
 * null even if a session row survived, so their queries never reach the database.
 */
export async function resolveSession(requestHeaders: Headers): Promise<ResolvedSession | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || session.user.situacao !== "ATIVO") return null;

  return {
    identity: { userId: session.user.id } as Identity,
    user: { id: session.user.id, nome: session.user.name, email: session.user.email },
  };
}

// Deduplicated per request: layout, page and route handler share one lookup
export const getSession = cache(async (): Promise<ResolvedSession | null> => resolveSession(await headers()));

export async function getIdentity(): Promise<Identity | null> {
  return (await getSession())?.identity ?? null;
}
