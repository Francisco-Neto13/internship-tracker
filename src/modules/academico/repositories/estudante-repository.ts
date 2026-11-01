import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { padraoContendo } from "@/db/like";
import { curso, estudante, usuario } from "@/db/schema";
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
  cursoNome: string | null;
};

/** Ordenações aceitas pela listagem (?ordem=campo ou -campo); o resto cai na matrícula. */
export const ORDENS_ESTUDANTE = ["nome", "matricula", "periodo", "situacao", "curso"] as const;
export type OrdemEstudante = (typeof ORDENS_ESTUDANTE)[number];

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
  cursoNome: curso.nome,
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
  filter: { cursoId?: string; usuarioId?: string; situacao?: SituacaoAcademica; busca?: string; ordem?: OrdemEstudante; decrescente?: boolean; limit: number; offset: number },
): Promise<{ items: EstudanteRow[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filter.cursoId) condicoes.push(eq(estudante.cursoId, filter.cursoId));
  if (filter.usuarioId) condicoes.push(eq(estudante.usuarioId, filter.usuarioId));
  if (filter.situacao) condicoes.push(eq(estudante.situacaoAcademica, filter.situacao));
  if (filter.busca) {
    const padrao = padraoContendo(filter.busca);
    condicoes.push(or(ilike(estudante.matricula, padrao), ilike(usuario.nome, padrao))!);
  }
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;

  const coluna = { nome: usuario.nome, matricula: estudante.matricula, periodo: estudante.periodo, situacao: estudante.situacaoAcademica, curso: curso.nome }[filter.ordem ?? "matricula"];
  const direcao = filter.decrescente ? desc : asc;

  const items = await tx
    .select(colunas)
    .from(estudante)
    // Left join keeps items and total consistent if a usuario row is filtered by its own policy
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .leftJoin(curso, eq(curso.id, estudante.cursoId))
    .where(where)
    // Matrícula desempata: a mesma página nunca repete nem pula um estudante
    .orderBy(direcao(coluna), asc(estudante.matricula))
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
    .leftJoin(curso, eq(curso.id, estudante.cursoId))
    .where(eq(estudante.id, id));
  return row;
}

export async function insertEstudante(
  tx: Transaction,
  values: { usuarioId: string; cursoId: string; matricula: string; periodo: number },
): Promise<Omit<EstudanteRow, "nome" | "email" | "cursoNome">> {
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
