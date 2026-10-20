import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { padraoContendo } from "@/db/like";
import { estudante, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter here on purpose: RLS decides which rows exist for the
// transaction's identity (RF003). Adding a WHERE on the user would hide policy bugs.

type SituacaoAcademica = (typeof estudante.situacaoAcademica.enumValues)[number];

export type EstudanteRow = {
  id: string;
  usuarioId: string;
  cursoId: string;
  nome: string | null;
  email: string | null;
  matricula: string;
  periodo: number;
  situacaoAcademica: SituacaoAcademica;
};

type EstudanteValues = Pick<EstudanteRow, "cursoId" | "matricula" | "periodo" | "situacaoAcademica">;

const colunas = {
  id: estudante.id,
  usuarioId: estudante.usuarioId,
  cursoId: estudante.cursoId,
  nome: usuario.nome,
  email: usuario.email,
  matricula: estudante.matricula,
  periodo: estudante.periodo,
  situacaoAcademica: estudante.situacaoAcademica,
};

const colunasEstudante = {
  id: estudante.id,
  usuarioId: estudante.usuarioId,
  cursoId: estudante.cursoId,
  matricula: estudante.matricula,
  periodo: estudante.periodo,
  situacaoAcademica: estudante.situacaoAcademica,
};

export async function findEstudantes(
  tx: Transaction,
  filter: { cursoId?: string; situacao?: SituacaoAcademica; busca?: string; limit: number; offset: number },
): Promise<{ items: EstudanteRow[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filter.cursoId) condicoes.push(eq(estudante.cursoId, filter.cursoId));
  if (filter.situacao) condicoes.push(eq(estudante.situacaoAcademica, filter.situacao));
  if (filter.busca) {
    const padrao = padraoContendo(filter.busca);
    condicoes.push(or(ilike(estudante.matricula, padrao), ilike(usuario.nome, padrao))!);
  }
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;

  const items = await tx
    .select(colunas)
    .from(estudante)
    // Left join keeps items and total consistent if a usuario row is filtered by its own policy
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(where)
    .orderBy(asc(estudante.matricula))
    .limit(filter.limit)
    .offset(filter.offset);

  const [{ total }] = await tx
    .select({ total: count() })
    .from(estudante)
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(where);

  return { items, total };
}

export async function findEstudanteById(tx: Transaction, id: string): Promise<EstudanteRow | undefined> {
  const [row] = await tx
    .select(colunas)
    .from(estudante)
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(eq(estudante.id, id));
  return row;
}

export async function insertEstudante(
  tx: Transaction,
  values: { usuarioId: string; cursoId: string; matricula: string; periodo: number },
): Promise<Omit<EstudanteRow, "nome" | "email">> {
  const [row] = await tx.insert(estudante).values(values).returning(colunasEstudante);
  return row;
}

/** Returns the id of the updated row, or undefined when RLS hid it or the id does not exist. */
export async function updateEstudante(
  tx: Transaction,
  id: string,
  values: Partial<EstudanteValues>,
): Promise<string | undefined> {
  const [row] = await tx.update(estudante).set(values).where(eq(estudante.id, id)).returning({ id: estudante.id });
  return row?.id;
}
