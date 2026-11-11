import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { padraoContendo } from "@/db/like";
import { identidadeEstudante } from "@/db/identidade-estudante";
import { concedente, convenio, curso, estagio, estudante } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { PapeisNoEstagio } from "../domain/papeis";

// No authorization filter: RLS (app.pode_ler_estagio) decides which internships exist for the
// caller (RF003, RN-37). The SQL helpers below answer yes/no or aggregates, never rows.

export type EstagioRow = typeof estagio.$inferSelect;
type Situacao = EstagioRow["situacao"];
type Tipo = EstagioRow["tipo"];

export type EstagioResumo = EstagioRow & { estudanteNome: string | null; matricula: string | null; concedenteRazaoSocial: string | null };

/** Ordenações da listagem (?ordem=campo ou -campo); o padrão são os mais recentes. */
export const ORDENS_ESTAGIO = ["estudante", "concedente", "inicio", "fim", "situacao"] as const;
export type OrdemEstagio = (typeof ORDENS_ESTAGIO)[number];

export async function findEstagios(
  tx: Transaction,
  filtro: {
    situacao?: Situacao;
    tipo?: Tipo;
    cursoId?: string;
    concedenteId?: string;
    estudanteId?: string;
    busca?: string;
    ordem?: OrdemEstagio;
    decrescente?: boolean;
    limit: number;
    offset: number;
  },
): Promise<{ items: EstagioResumo[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filtro.situacao) condicoes.push(eq(estagio.situacao, filtro.situacao));
  if (filtro.tipo) condicoes.push(eq(estagio.tipo, filtro.tipo));
  if (filtro.cursoId) condicoes.push(eq(estagio.cursoId, filtro.cursoId));
  if (filtro.concedenteId) condicoes.push(eq(estagio.concedenteId, filtro.concedenteId));
  if (filtro.estudanteId) condicoes.push(eq(estagio.estudanteId, filtro.estudanteId));
  if (filtro.busca) {
    const padrao = padraoContendo(filtro.busca);
    condicoes.push(or(ilike(identidadeEstudante.nome, padrao), ilike(identidadeEstudante.matricula, padrao), ilike(concedente.razaoSocial, padrao))!);
  }
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;
  const coluna = {
    estudante: identidadeEstudante.nome,
    concedente: concedente.razaoSocial,
    inicio: estagio.dataInicio,
    fim: estagio.dataFimPrevista,
    situacao: estagio.situacao,
  }[filtro.ordem ?? "inicio"];
  const ordenacao = filtro.ordem ? [(filtro.decrescente ? desc : asc)(coluna), asc(estagio.id)] : [desc(estagio.criadoEm), asc(estagio.id)];

  const linhas = await tx
    .select({
      estagio,
      estudanteNome: identidadeEstudante.nome,
      matricula: identidadeEstudante.matricula,
      concedenteRazaoSocial: concedente.razaoSocial,
    })
    .from(estagio)
    .leftJoin(identidadeEstudante.juncao, identidadeEstudante.correspondencia)
    .leftJoin(concedente, eq(concedente.id, estagio.concedenteId))
    .where(where)
    .orderBy(...ordenacao)
    .limit(filtro.limit)
    .offset(filtro.offset);
  // Same joins as the page: the search reaches the student and the concedente names
  const [{ total }] = await tx
    .select({ total: count() })
    .from(estagio)
    .leftJoin(identidadeEstudante.juncao, identidadeEstudante.correspondencia)
    .leftJoin(concedente, eq(concedente.id, estagio.concedenteId))
    .where(where);

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
/** RF022: names of the parties for the documents; null where the caller cannot read them. */
export async function findIdentificacaoEstagio(tx: Transaction, row: EstagioRow) {
  const [linha] = await tx
    .select({
      estudanteNome: identidadeEstudante.nome,
      matricula: identidadeEstudante.matricula,
      curso: curso.nome,
      concedente: concedente.razaoSocial,
      cnpj: concedente.cnpj,
      convenio: convenio.numero,
    })
    .from(estagio)
    .leftJoin(identidadeEstudante.juncao, identidadeEstudante.correspondencia)
    .leftJoin(curso, eq(curso.id, estagio.cursoId))
    .leftJoin(concedente, eq(concedente.id, estagio.concedenteId))
    .leftJoin(convenio, eq(convenio.id, estagio.convenioId))
    .where(eq(estagio.id, row.id));
  return linha ?? { estudanteNome: null, matricula: null, curso: null, concedente: null, cnpj: null, convenio: null };
}

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

/** Roles of the caller in one internship, read from the functions the policies and triggers use. */
export async function findPapeisNoEstagio(tx: Transaction, estagioId: string): Promise<PapeisNoEstagio> {
  const { rows } = await tx.execute<PapeisNoEstagio>(sql`
    select app.e_estudante_do_estagio(${estagioId}::uuid) as estudante,
           app.e_responsavel_vigente(${estagioId}::uuid, 'ORIENTADOR') as orientador,
           app.e_responsavel_vigente(${estagioId}::uuid, 'SUPERVISOR') as supervisor,
           app.coordena_curso_do_estagio(${estagioId}::uuid) as coordenacao,
           app.representa_concedente_do_estagio(${estagioId}::uuid) as concedente,
           app.em_contexto_administrador() as "contextoAdministrador"
  `);
  return rows[0];
}
