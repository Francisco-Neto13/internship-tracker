import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { vinculoPerfil } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

export type PerfilVigente = {
  perfil: (typeof vinculoPerfil.perfil.enumValues)[number];
  cursoId: string | null;
};

export async function findPerfisVigentes(tx: Transaction, usuarioId: string): Promise<PerfilVigente[]> {
  const now = sql`now()`;
  return tx
    .select({ perfil: vinculoPerfil.perfil, cursoId: vinculoPerfil.cursoId })
    .from(vinculoPerfil)
    .where(
      and(
        eq(vinculoPerfil.usuarioId, usuarioId),
        lte(vinculoPerfil.vigenciaInicio, now),
        or(isNull(vinculoPerfil.vigenciaFim), gt(vinculoPerfil.vigenciaFim, now)),
      ),
    )
    .orderBy(asc(vinculoPerfil.perfil));
}
