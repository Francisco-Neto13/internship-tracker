import { asc, count, eq } from "drizzle-orm";
import { estudante, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter here on purpose: RLS decides which rows exist for the
// transaction's identity (RF003). Adding a WHERE on the user would hide policy bugs.

export type EstudanteRow = {
  id: string;
  usuarioId: string;
  cursoId: string;
  nome: string | null;
  matricula: string;
  periodo: number;
  situacaoAcademica: "MATRICULADO" | "TRANCADO" | "FORMADO" | "DESLIGADO";
};

export async function findEstudantes(
  tx: Transaction,
  filter: { cursoId?: string; limit: number; offset: number },
): Promise<{ items: EstudanteRow[]; total: number }> {
  const where = filter.cursoId ? eq(estudante.cursoId, filter.cursoId) : undefined;

  const items = await tx
    .select({
      id: estudante.id,
      usuarioId: estudante.usuarioId,
      cursoId: estudante.cursoId,
      nome: usuario.nome,
      matricula: estudante.matricula,
      periodo: estudante.periodo,
      situacaoAcademica: estudante.situacaoAcademica,
    })
    .from(estudante)
    // Left join keeps items and total consistent if a usuario row is filtered by its own policy
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(where)
    .orderBy(asc(estudante.matricula))
    .limit(filter.limit)
    .offset(filter.offset);

  const [{ total }] = await tx.select({ total: count() }).from(estudante).where(where);

  return { items, total };
}

export async function insertEstudante(
  tx: Transaction,
  values: { usuarioId: string; cursoId: string; matricula: string; periodo: number },
): Promise<Omit<EstudanteRow, "nome">> {
  const [row] = await tx.insert(estudante).values(values).returning({
    id: estudante.id,
    usuarioId: estudante.usuarioId,
    cursoId: estudante.cursoId,
    matricula: estudante.matricula,
    periodo: estudante.periodo,
    situacaoAcademica: estudante.situacaoAcademica,
  });
  return row;
}
