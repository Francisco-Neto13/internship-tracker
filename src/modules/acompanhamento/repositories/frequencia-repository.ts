import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { divergenciaCargaHoraria, estagio, homologacaoFrequencia, registroFrequencia, SITUACOES_VIGENTES, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// Frequency, homologation and divergence (RF023 to RF030). No authorization filter: RLS and
// the triggers of functions/08_frequencia.sql decide. M05 reads the internship it follows
// (M05 -> M04 is an allowed direction) through the table, under the same RLS.

export type FrequenciaRow = typeof registroFrequencia.$inferSelect;
export type HomologacaoRow = typeof homologacaoFrequencia.$inferSelect & { homologadoPorNome?: string | null };
export type DivergenciaRow = typeof divergenciaCargaHoraria.$inferSelect;
export type SituacaoFrequencia = FrequenciaRow["situacao"];

export type EstagioAcompanhado = Pick<
  typeof estagio.$inferSelect,
  "id" | "situacao" | "tipo" | "cursoId" | "estudanteId" | "concedenteId" | "dataInicio" | "dataFimPrevista" | "cargaSemanalMinutos" | "cargaTotalMinutos"
>;

const colunasEstagio = {
  id: estagio.id,
  situacao: estagio.situacao,
  tipo: estagio.tipo,
  cursoId: estagio.cursoId,
  estudanteId: estagio.estudanteId,
  concedenteId: estagio.concedenteId,
  dataInicio: estagio.dataInicio,
  dataFimPrevista: estagio.dataFimPrevista,
  cargaSemanalMinutos: estagio.cargaSemanalMinutos,
  cargaTotalMinutos: estagio.cargaTotalMinutos,
};

export async function findEstagioAcompanhado(tx: Transaction, id: string): Promise<EstagioAcompanhado | undefined> {
  const [row] = await tx.select(colunasEstagio).from(estagio).where(eq(estagio.id, id));
  return row;
}

/** Locks the internship for writes that depend on its sums (weekly limit, homologation). */
export async function travarEstagio(tx: Transaction, id: string): Promise<boolean> {
  const { rows } = await tx.execute<{ travado: boolean }>(sql`select app.travar_estagio(${id}::uuid) as travado`);
  return rows[0]?.travado === true;
}

export async function hoje(tx: Transaction): Promise<string> {
  const { rows } = await tx.execute<{ hoje: string }>(sql`select app.hoje()::text as hoje`);
  return rows[0].hoje;
}

export type ParametrosJornada = {
  parametroId: string | null;
  limiteDiarioObrigatorioMinutos: number;
  limiteDiarioNaoObrigatorioMinutos: number;
  limiteSemanalMinutos: number;
  bloquearExcedente: boolean;
  toleranciaDivergenciaPercentual: number;
};

/** RF006, RF024: the same parameters the trigger applies (legal defaults when none in force). */
export async function parametrosEm(tx: Transaction, data: string): Promise<ParametrosJornada> {
  const { rows } = await tx.execute<{
    parametro_id: string | null;
    limite_diario_obrigatorio_minutos: number;
    limite_diario_nao_obrigatorio_minutos: number;
    limite_semanal_minutos: number;
    bloquear_excedente: boolean;
    tolerancia_divergencia_percentual: string;
  }>(sql`select * from app.parametros_em(${data}::date)`);
  const row = rows[0];
  return {
    parametroId: row.parametro_id,
    limiteDiarioObrigatorioMinutos: row.limite_diario_obrigatorio_minutos,
    limiteDiarioNaoObrigatorioMinutos: row.limite_diario_nao_obrigatorio_minutos,
    limiteSemanalMinutos: row.limite_semanal_minutos,
    bloquearExcedente: row.bloquear_excedente,
    toleranciaDivergenciaPercentual: Number(row.tolerancia_divergencia_percentual),
  };
}

/** D4: minutes in force from `inicio` to `fim` (an ISO week), entries in force only. */
export async function minutosVigentesEntre(tx: Transaction, estagioId: string, inicio: string, fim: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${registroFrequencia.duracaoMinutos}), 0)` })
    .from(registroFrequencia)
    .where(
      and(
        eq(registroFrequencia.estagioId, estagioId),
        inArray(registroFrequencia.situacao, [...SITUACOES_VIGENTES]),
        gte(registroFrequencia.data, inicio),
        lte(registroFrequencia.data, fim),
      ),
    );
  return Number(row.total);
}

export type FiltrosFrequencia = { dataInicio?: string; dataFim?: string; situacao?: SituacaoFrequencia };

export async function findFrequencias(tx: Transaction, estagioId: string, filtros: FiltrosFrequencia): Promise<FrequenciaRow[]> {
  return tx
    .select()
    .from(registroFrequencia)
    .where(
      and(
        eq(registroFrequencia.estagioId, estagioId),
        filtros.dataInicio ? gte(registroFrequencia.data, filtros.dataInicio) : undefined,
        filtros.dataFim ? lte(registroFrequencia.data, filtros.dataFim) : undefined,
        filtros.situacao ? eq(registroFrequencia.situacao, filtros.situacao) : undefined,
      ),
    )
    .orderBy(desc(registroFrequencia.data), asc(registroFrequencia.criadoEm));
}

export async function findFrequenciaById(tx: Transaction, id: string): Promise<FrequenciaRow | undefined> {
  const [row] = await tx.select().from(registroFrequencia).where(eq(registroFrequencia.id, id));
  return row;
}

export type NovaFrequencia = Pick<
  typeof registroFrequencia.$inferInsert,
  "estagioId" | "data" | "horaEntrada" | "horaSaida" | "intervaloMinutos" | "duracaoMinutos" | "observacao" | "substituiRegistroId" | "justificativaAjuste" | "registradoPorUsuarioId"
>;

/** The trigger decides situacao, excedeu_limite and the limits; the placeholders are overwritten. */
export async function insertFrequencia(tx: Transaction, values: NovaFrequencia): Promise<FrequenciaRow> {
  const [row] = await tx
    .insert(registroFrequencia)
    .values({ ...values, limiteDiarioAplicadoMinutos: 1, limiteSemanalAplicadoMinutos: 1 })
    .returning();
  return row;
}

export async function updateFrequencia(
  tx: Transaction,
  id: string,
  values: Partial<Pick<FrequenciaRow, "situacao" | "homologacaoId" | "justificativaCancelamento">>,
): Promise<FrequenciaRow | undefined> {
  const [row] = await tx.update(registroFrequencia).set(values).where(eq(registroFrequencia.id, id)).returning();
  return row;
}

// ---------------------------------------------------------------- homologação

/** RF027: entries in force still waiting for homologation in a period. */
export async function findPendentesNoPeriodo(tx: Transaction, estagioId: string, inicio: string, fim: string): Promise<FrequenciaRow[]> {
  return tx
    .select()
    .from(registroFrequencia)
    .where(
      and(
        eq(registroFrequencia.estagioId, estagioId),
        inArray(registroFrequencia.situacao, ["REGISTRADO", "SINALIZADO"]),
        gte(registroFrequencia.data, inicio),
        lte(registroFrequencia.data, fim),
      ),
    )
    .orderBy(asc(registroFrequencia.data));
}

export async function insertHomologacao(tx: Transaction, values: Omit<typeof homologacaoFrequencia.$inferInsert, "id" | "criadoEm">): Promise<HomologacaoRow> {
  const [row] = await tx.insert(homologacaoFrequencia).values(values).returning();
  return row;
}

export async function marcarHomologados(tx: Transaction, ids: string[], homologacaoId: string): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await tx
    .update(registroFrequencia)
    .set({ situacao: "HOMOLOGADO", homologacaoId })
    .where(inArray(registroFrequencia.id, ids))
    .returning({ id: registroFrequencia.id });
  return rows.length;
}

export async function findHomologacoes(tx: Transaction, estagioId: string): Promise<HomologacaoRow[]> {
  const linhas = await tx
    .select({ homologacao: homologacaoFrequencia, homologadoPorNome: usuario.nome })
    .from(homologacaoFrequencia)
    .leftJoin(usuario, eq(usuario.id, homologacaoFrequencia.homologadoPorUsuarioId))
    .where(eq(homologacaoFrequencia.estagioId, estagioId))
    .orderBy(desc(homologacaoFrequencia.periodoInicio), desc(homologacaoFrequencia.criadoEm));
  return linhas.map((linha) => ({ ...linha.homologacao, homologadoPorNome: linha.homologadoPorNome }));
}

// ---------------------------------------------------------------- carga horária

export type Totais = {
  minutosCumpridos: number;
  minutosHomologados: number;
  minutosPendentes: number;
  lancamentosSinalizados: number;
  /** Entries in force up to the divergence reference date (RF028). */
  minutosCumpridosAteReferencia: number;
};

const somaSe = (condicao: ReturnType<typeof sql>) => sql<string>`coalesce(sum(${registroFrequencia.duracaoMinutos}) filter (where ${condicao}), 0)`;
const vigente = sql`${registroFrequencia.situacao} in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO')`;

/** RF026: one pass over the entries of the internship (index estagio_id, data, situacao). */
export async function totaisFrequencia(tx: Transaction, estagioId: string, dataReferencia: string): Promise<Totais> {
  const [row] = await tx
    .select({
      cumpridos: somaSe(vigente),
      homologados: somaSe(sql`${registroFrequencia.situacao} = 'HOMOLOGADO'`),
      pendentes: somaSe(sql`${registroFrequencia.situacao} in ('REGISTRADO', 'SINALIZADO')`),
      sinalizados: sql<string>`count(*) filter (where ${registroFrequencia.situacao} = 'SINALIZADO')`,
      ateReferencia: somaSe(sql`${vigente} and ${registroFrequencia.data} <= ${dataReferencia}::date`),
    })
    .from(registroFrequencia)
    .where(eq(registroFrequencia.estagioId, estagioId));
  return {
    minutosCumpridos: Number(row.cumpridos),
    minutosHomologados: Number(row.homologados),
    minutosPendentes: Number(row.pendentes),
    lancamentosSinalizados: Number(row.sinalizados),
    minutosCumpridosAteReferencia: Number(row.ateReferencia),
  };
}

/**
 * RF028: active internships the caller follows as advisor or coordination, with the minutes in
 * force up to the reference date, in a single aggregate (the RLS of estagio picks the rows).
 */
export async function findEstagiosAtivosComCumpridos(tx: Transaction, dataReferencia: string) {
  const cumpridos = tx
    .select({
      estagioId: registroFrequencia.estagioId,
      minutos: sql<string>`sum(${registroFrequencia.duracaoMinutos})`.as("minutos"),
    })
    .from(registroFrequencia)
    .where(and(vigente, lte(registroFrequencia.data, dataReferencia)))
    .groupBy(registroFrequencia.estagioId)
    .as("cumpridos");
  const linhas = await tx
    .select({ estagio: colunasEstagio, minutosCumpridos: cumpridos.minutos })
    .from(estagio)
    .leftJoin(cumpridos, eq(cumpridos.estagioId, estagio.id))
    .where(
      and(
        eq(estagio.situacao, "ATIVO"),
        sql`(app.e_responsavel_vigente(${estagio.id}, 'ORIENTADOR') or app.coordena_curso(${estagio.cursoId}))`,
      ),
    )
    .orderBy(asc(estagio.dataInicio));
  return linhas.map((linha) => ({ estagio: linha.estagio, minutosCumpridos: Number(linha.minutosCumpridos ?? 0) }));
}

// ---------------------------------------------------------------- divergência

export async function findDivergencias(tx: Transaction, estagioId?: string): Promise<DivergenciaRow[]> {
  return tx
    .select()
    .from(divergenciaCargaHoraria)
    .where(estagioId ? eq(divergenciaCargaHoraria.estagioId, estagioId) : undefined)
    .orderBy(desc(divergenciaCargaHoraria.criadoEm));
}

export async function findDivergenciaById(tx: Transaction, id: string): Promise<DivergenciaRow | undefined> {
  const [row] = await tx.select().from(divergenciaCargaHoraria).where(eq(divergenciaCargaHoraria.id, id));
  return row;
}

/**
 * Opens a case unless one is already open. No RETURNING: the write may come from the
 * supervisor or the concedente's side, who do not read divergences (RN-09).
 */
export async function abrirDivergencia(
  tx: Transaction,
  values: { estagioId: string; dataReferencia: string; minutosPrevistos: number; minutosCumpridos: number; toleranciaPercentual: number },
): Promise<void> {
  await tx.execute(sql`
    insert into public.divergencia_carga_horaria (estagio_id, data_referencia, minutos_previstos, minutos_cumpridos, tolerancia_percentual)
    values (${values.estagioId}::uuid, ${values.dataReferencia}::date, ${values.minutosPrevistos}, ${values.minutosCumpridos}, ${values.toleranciaPercentual})
    on conflict (estagio_id) where situacao = 'ABERTA' do nothing
  `);
}

export async function analisarDivergencia(tx: Transaction, id: string, parecer: string, usuarioId: string): Promise<DivergenciaRow | undefined> {
  const [row] = await tx
    .update(divergenciaCargaHoraria)
    .set({ situacao: "ANALISADA", parecer, analisadaPorUsuarioId: usuarioId, analisadaEm: new Date() })
    .where(eq(divergenciaCargaHoraria.id, id))
    .returning();
  return row;
}
