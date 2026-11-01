import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { vinculoPerfil } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

type Perfil = (typeof vinculoPerfil.perfil.enumValues)[number];

export type PerfilVigente = {
  perfil: Perfil;
  cursoId: string | null;
  concedenteId: string | null;
};

export type VinculoRow = {
  id: string;
  usuarioId: string;
  perfil: Perfil;
  cursoId: string | null;
  concedenteId: string | null;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
};

const colunas = {
  id: vinculoPerfil.id,
  usuarioId: vinculoPerfil.usuarioId,
  perfil: vinculoPerfil.perfil,
  cursoId: vinculoPerfil.cursoId,
  concedenteId: vinculoPerfil.concedenteId,
  vigenciaInicio: vinculoPerfil.vigenciaInicio,
  vigenciaFim: vinculoPerfil.vigenciaFim,
};

/** A link in force now: started, and not yet closed (same rule as app.tem_perfil_vigente). */
export function vinculoVigente() {
  const now = sql`now()`;
  return and(lte(vinculoPerfil.vigenciaInicio, now), or(isNull(vinculoPerfil.vigenciaFim), gt(vinculoPerfil.vigenciaFim, now)));
}

export async function findPerfisVigentes(tx: Transaction, usuarioId: string): Promise<PerfilVigente[]> {
  return tx
    .select({ perfil: vinculoPerfil.perfil, cursoId: vinculoPerfil.cursoId, concedenteId: vinculoPerfil.concedenteId })
    .from(vinculoPerfil)
    .where(and(eq(vinculoPerfil.usuarioId, usuarioId), vinculoVigente()))
    .orderBy(asc(vinculoPerfil.perfil));
}

export async function findVinculosVigentes(tx: Transaction, usuarioIds: string[]): Promise<VinculoRow[]> {
  if (usuarioIds.length === 0) return [];
  return tx
    .select(colunas)
    .from(vinculoPerfil)
    .where(and(inArray(vinculoPerfil.usuarioId, usuarioIds), vinculoVigente()))
    .orderBy(asc(vinculoPerfil.perfil));
}

/** Every link the user ever had, closed ones included: links are never deleted (RN-28). */
export async function findHistoricoVinculos(tx: Transaction, usuarioId: string): Promise<VinculoRow[]> {
  return tx
    .select(colunas)
    .from(vinculoPerfil)
    .where(eq(vinculoPerfil.usuarioId, usuarioId))
    .orderBy(desc(vinculoPerfil.vigenciaInicio), asc(vinculoPerfil.perfil));
}

export async function insertVinculos(
  tx: Transaction,
  usuarioId: string,
  vinculos: { perfil: Perfil; cursoId: string | null; concedenteId?: string | null }[],
): Promise<VinculoRow[]> {
  if (vinculos.length === 0) return [];
  return tx
    .insert(vinculoPerfil)
    .values(
      vinculos.map((vinculo) => ({ usuarioId, perfil: vinculo.perfil, cursoId: vinculo.cursoId, concedenteId: vinculo.concedenteId ?? null })),
    )
    .returning(colunas);
}

/** Closes links instead of deleting them; the grant only allows writing vigencia_fim. */
export async function encerrarVinculos(tx: Transaction, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await tx
    .update(vinculoPerfil)
    .set({ vigenciaFim: sql`now()` })
    .where(inArray(vinculoPerfil.id, ids))
    .returning({ id: vinculoPerfil.id });
  return rows.map((row) => row.id);
}
