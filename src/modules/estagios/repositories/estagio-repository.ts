import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { concedente, estagio, estudante, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter: RLS (app.pode_ler_estagio) decides which internships exist for the
// caller (RF003, RN-37). The SQL helpers below answer yes/no or aggregates, never rows.

export type EstagioRow = typeof estagio.$inferSelect;
type Situacao = EstagioRow["situacao"];
type Tipo = EstagioRow["tipo"];

export type EstagioResumo = EstagioRow & { estudanteNome: string | null; matricula: string | null; concedenteRazaoSocial: string | null };

const usuarioEstudante = alias(usuario, "usuario_estudante");

export async function findEstagios(
  tx: Transaction,
  filtro: { situacao?: Situacao; tipo?: Tipo; cursoId?: string; concedenteId?: string; estudanteId?: string; limit: number; offset: number },
): Promise<{ items: EstagioResumo[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filtro.situacao) condicoes.push(eq(estagio.situacao, filtro.situacao));
  if (filtro.tipo) condicoes.push(eq(estagio.tipo, filtro.tipo));
  if (filtro.cursoId) condicoes.push(eq(estagio.cursoId, filtro.cursoId));
  if (filtro.concedenteId) condicoes.push(eq(estagio.concedenteId, filtro.concedenteId));
  if (filtro.estudanteId) condicoes.push(eq(estagio.estudanteId, filtro.estudanteId));
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;

  const linhas = await tx
    .select({
      estagio,
      estudanteNome: usuarioEstudante.nome,
      matricula: estudante.matricula,
      concedenteRazaoSocial: concedente.razaoSocial,
    })
    .from(estagio)
    .leftJoin(estudante, eq(estudante.id, estagio.estudanteId))
    .leftJoin(usuarioEstudante, eq(usuarioEstudante.id, estudante.usuarioId))
    .leftJoin(concedente, eq(concedente.id, estagio.concedenteId))
    .where(where)
    .orderBy(desc(estagio.criadoEm))
    .limit(filtro.limit)
    .offset(filtro.offset);
  const [{ total }] = await tx.select({ total: count() }).from(estagio).where(where);

  return {
    items: linhas.map((linha) => ({
      ...linha.estagio,
      estudanteNome: linha.estudanteNome,
      matricula: linha.matricula,
      concedenteRazaoSocial: linha.concedenteRazaoSocial,
    })),
    total,
  };
}

export async function findEstagioById(tx: Transaction, id: string): Promise<EstagioRow | undefined> {
  const [row] = await tx.select().from(estagio).where(eq(estagio.id, id));
  return row;
}

/** Locks the row for the rest of the transaction (activation, amendments). */
export async function lockEstagio(tx: Transaction, id: string): Promise<EstagioRow | undefined> {
  const [row] = await tx.select().from(estagio).where(eq(estagio.id, id)).for("update");
  return row;
}

export async function insertEstagio(
  tx: Transaction,
  values: Omit<EstagioRow, "id" | "situacao" | "hashTce" | "tceFechadoEm" | "justificativaReabertura" | "ativadoEm" | "encerradoEm" | "criadoEm" | "atualizadoEm" | "documentoTceId" | "dispensaDocumentoId">,
): Promise<EstagioRow> {
  const [row] = await tx.insert(estagio).values(values).returning();
  return row;
}

/** Undefined when RLS hid the row or the caller may not write it. */
export async function updateEstagio(tx: Transaction, id: string, values: Partial<EstagioRow>): Promise<EstagioRow | undefined> {
  const [row] = await tx.update(estagio).set(values).where(eq(estagio.id, id)).returning();
  return row;
}

/** RF008: situation of the concedente, read in the activation transaction (catalog readable by all). */
export async function situacaoConcedente(tx: Transaction, concedenteId: string): Promise<string | null> {
  const [row] = await tx.select({ situacao: concedente.situacao }).from(concedente).where(eq(concedente.id, concedenteId));
  return row?.situacao ?? null;
}

/** D10: academic situation of the student, as the caller sees it under RLS. */
export async function situacaoAcademica(tx: Transaction, estudanteId: string): Promise<string | null> {
  const [row] = await tx.select({ situacao: estudante.situacaoAcademica }).from(estudante).where(eq(estudante.id, estudanteId));
  return row?.situacao ?? null;
}

/** Course of the student as the caller sees it under RLS; copied to the internship (DER §8). */
export async function cursoDoEstudante(tx: Transaction, estudanteId: string): Promise<string | null> {
  const [row] = await tx.select({ cursoId: estudante.cursoId }).from(estudante).where(eq(estudante.id, estudanteId));
  return row?.cursoId ?? null;
}

async function booleano(tx: Transaction, consulta: SQL): Promise<boolean> {
  const { rows } = await tx.execute<{ resultado: boolean }>(sql`select (${consulta}) as resultado`);
  return rows[0]?.resultado === true;
}

/** RF010, RN-02: app.convenio_vigente_em (works for every caller, exposes no agreement). */
export function convenioVigenteEm(tx: Transaction, convenioId: string, concedenteId: string, data: string) {
  return booleano(tx, sql`app.convenio_vigente_em(${convenioId}::uuid, ${concedenteId}::uuid, ${data}::date)`);
}

export async function diasUsadosNoPar(tx: Transaction, estudanteId: string, concedenteId: string, excetoEstagioId: string | null) {
  const { rows } = await tx.execute<{ dias: number }>(
    sql`select app.dias_usados_no_par(${estudanteId}::uuid, ${concedenteId}::uuid, ${excetoEstagioId}::uuid) as dias`,
  );
  return Number(rows[0]?.dias ?? 0);
}

export function temOutroEstagioAtivo(tx: Transaction, estudanteId: string, excetoEstagioId: string) {
  return booleano(tx, sql`app.tem_outro_estagio_ativo(${estudanteId}::uuid, ${excetoEstagioId}::uuid)`);
}

export function podeAssinar(tx: Transaction, estagioId: string, parte: string) {
  return booleano(tx, sql`app.pode_assinar(${estagioId}::uuid, ${parte}::public.parte_assinatura)`);
}

/** RF014, RF008: internships of a concedente by situation (aggregate only). */
export async function historicoConcedente(tx: Transaction, concedenteId: string): Promise<Record<string, number>> {
  const { rows } = await tx.execute<{ situacao: string; quantidade: string }>(
    sql`select situacao, quantidade from app.historico_estagios_concedente(${concedenteId}::uuid)`,
  );
  return Object.fromEntries(rows.map((row) => [row.situacao, Number(row.quantidade)]));
}
