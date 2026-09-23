import { withUser } from "@/db/with-user";
import type { Identity } from "@/lib/identity";
import { findUltimosRegistros } from "../repositories/auditoria-repository";

/** Most recent audit entries visible to the identity. RLS grants read only to
 * ADMINISTRADOR (RF065, RF066); every other profile resolves to an empty list. */
export async function listUltimosRegistros(identity: Identity, limit = 50) {
  return withUser(identity, (tx) => findUltimosRegistros(tx, limit));
}
