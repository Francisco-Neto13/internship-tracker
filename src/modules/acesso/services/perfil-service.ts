import { withUser } from "@/db/with-user";
import type { Identity } from "@/lib/identity";
import { findPerfisVigentes } from "../repositories/vinculo-perfil-repository";

/** Profiles in force for the authenticated user, used to shape navigation (RF003). */
export async function listPerfisVigentes(identity: Identity) {
  return withUser(identity, (tx) => findPerfisVigentes(tx, identity.userId));
}
