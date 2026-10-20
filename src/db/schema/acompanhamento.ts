import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usuario } from "./acesso";
import { parametroInstitucional } from "./academico";
import { estagio } from "./estagios";

// M05 Acompanhamento (DER-LOGICO §4.5). Enums are complete from this first migration.

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

export const situacaoFrequencia = pgEnum("situacao_frequencia", ["REGISTRADO", "SINALIZADO", "HOMOLOGADO", "SUBSTITUIDO", "CANCELADO"]);
export const situacaoDivergencia = pgEnum("situacao_divergencia", ["ABERTA", "ANALISADA"]);

// Entries that count as hours worked (RF026): the one entry in force for the day (D2)
export const SITUACOES_VIGENTES = ["REGISTRADO", "SINALIZADO", "HOMOLOGADO"] as const;

// RF023 to RF030, RN-07, RN-08: one entry in force per day (D2), with a break for split
// shifts. A correction is a new row pointing to the replaced one (RF029); content never
// changes. The trigger app.validar_registro_frequencia decides situacao, excedeu_limite and
// the limits applied, which are stored so the past never depends on today's parameters.
export const registroFrequencia = pgTable(
  "registro_frequencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    data: date("data").notNull(),
    horaEntrada: time("hora_entrada", { precision: 0 }),
    horaSaida: time("hora_saida", { precision: 0 }),
    intervaloMinutos: integer("intervalo_minutos").notNull().default(0),
    duracaoMinutos: integer("duracao_minutos").notNull(),
    observacao: text("observacao"),
    situacao: situacaoFrequencia("situacao").notNull().default("REGISTRADO"),
    excedeuLimite: boolean("excedeu_limite").notNull().default(false),
    // Null when the legal defaults applied (no institutional version in force on `data`)
    parametroInstitucionalId: uuid("parametro_institucional_id").references(() => parametroInstitucional.id),
    limiteDiarioAplicadoMinutos: integer("limite_diario_aplicado_minutos").notNull(),
    limiteSemanalAplicadoMinutos: integer("limite_semanal_aplicado_minutos").notNull(),
    substituiRegistroId: uuid("substitui_registro_id")
      .unique()
      .references((): AnyPgColumn => registroFrequencia.id),
    justificativaAjuste: text("justificativa_ajuste"),
    homologacaoId: uuid("homologacao_id").references((): AnyPgColumn => homologacaoFrequencia.id),
    justificativaCancelamento: text("justificativa_cancelamento"),
    registradoPorUsuarioId: uuid("registrado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    // D2: one entry in force per day; corrections and cancellations free the day
    uniqueIndex("frequencia_um_vigente_por_dia")
      .on(t.estagioId, t.data)
      .where(sql`${t.situacao} in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO')`),
    // RF024 (weekly sum), RF026 (accumulation) and the RLS join, all by estagio_id first
    index("frequencia_estagio_data_situacao_idx").on(t.estagioId, t.data, t.situacao),
    index("frequencia_homologacao_idx").on(t.homologacaoId),
    index("frequencia_parametro_idx").on(t.parametroInstitucionalId),
    index("frequencia_registrado_por_idx").on(t.registradoPorUsuarioId),
    check("frequencia_horario_completo", sql`(${t.horaEntrada} is null) = (${t.horaSaida} is null)`),
    check("frequencia_saida_apos_entrada", sql`${t.horaEntrada} is null or ${t.horaSaida} > ${t.horaEntrada}`),
    check("frequencia_intervalo_valido", sql`${t.intervaloMinutos} >= 0 and (${t.horaEntrada} is not null or ${t.intervaloMinutos} = 0)`),
    check("frequencia_duracao_valida", sql`${t.duracaoMinutos} > 0 and ${t.duracaoMinutos} <= 1440`),
    check(
      "frequencia_duracao_do_horario",
      sql`${t.horaEntrada} is null or ${t.duracaoMinutos} = extract(epoch from (${t.horaSaida} - ${t.horaEntrada}))::integer / 60 - ${t.intervaloMinutos}`,
    ),
    check("frequencia_sinalizado_excedeu", sql`${t.situacao} <> 'SINALIZADO' or ${t.excedeuLimite}`),
    check("frequencia_ajuste_justificado", sql`(${t.substituiRegistroId} is null) = (${t.justificativaAjuste} is null)`),
    check("frequencia_homologado_com_homologacao", sql`${t.situacao} <> 'HOMOLOGADO' or ${t.homologacaoId} is not null`),
    check("frequencia_cancelamento_justificado", sql`(${t.situacao} = 'CANCELADO') = (${t.justificativaCancelamento} is not null)`),
    check("frequencia_limites_positivos", sql`${t.limiteDiarioAplicadoMinutos} > 0 and ${t.limiteSemanalAplicadoMinutos} > 0`),
  ],
);

// RF027, RN-08: the supervisor validates the entries of a period. Immutable; which entries
// it covers is registro_frequencia.homologacao_id, and the total is checked at commit.
export const homologacaoFrequencia = pgTable(
  "homologacao_frequencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    periodoInicio: date("periodo_inicio").notNull(),
    periodoFim: date("periodo_fim").notNull(),
    minutosHomologados: integer("minutos_homologados").notNull(),
    // The supervisor's opinion on the period (traceability: who, when, what and why)
    observacao: text("observacao"),
    homologadoPorUsuarioId: uuid("homologado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("homologacao_estagio_periodo_idx").on(t.estagioId, t.periodoInicio),
    index("homologacao_homologado_por_idx").on(t.homologadoPorUsuarioId),
    check("homologacao_periodo_valido", sql`${t.periodoFim} >= ${t.periodoInicio}`),
    check("homologacao_minutos_positivos", sql`${t.minutosHomologados} > 0`),
  ],
);

// RF028, RN-09: a relevant difference between registered and expected hours, recorded for the
// advisor to analyze. One open case per internship; the analysis closes it and keeps it.
export const divergenciaCargaHoraria = pgTable(
  "divergencia_carga_horaria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    dataReferencia: date("data_referencia").notNull(),
    minutosPrevistos: integer("minutos_previstos").notNull(),
    minutosCumpridos: integer("minutos_cumpridos").notNull(),
    toleranciaPercentual: numeric("tolerancia_percentual", { precision: 5, scale: 2, mode: "number" }).notNull(),
    situacao: situacaoDivergencia("situacao").notNull().default("ABERTA"),
    parecer: text("parecer"),
    analisadaPorUsuarioId: uuid("analisada_por_usuario_id").references(() => usuario.id),
    analisadaEm: timestamp("analisada_em", { withTimezone: true }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("divergencia_uma_aberta_por_estagio").on(t.estagioId).where(sql`${t.situacao} = 'ABERTA'`),
    index("divergencia_estagio_idx").on(t.estagioId, t.criadoEm),
    index("divergencia_analisada_por_idx").on(t.analisadaPorUsuarioId),
    check("divergencia_minutos_validos", sql`${t.minutosPrevistos} > 0 and ${t.minutosCumpridos} >= 0`),
    check("divergencia_tolerancia_valida", sql`${t.toleranciaPercentual} between 0 and 100`),
    check(
      "divergencia_analise_consistente",
      sql`(${t.situacao} = 'ANALISADA') = (${t.analisadaEm} is not null) and (${t.analisadaEm} is null) = (${t.analisadaPorUsuarioId} is null) and (${t.situacao} = 'ABERTA' or ${t.parecer} is not null)`,
    ),
  ],
);
