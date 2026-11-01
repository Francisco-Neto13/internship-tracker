import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usuario } from "./acesso";
import { categoriaAtividade, estudante } from "./academico";
import { documento } from "./documentos";
import { estagio } from "./estagios";

// M06 Atividades Complementares (DER-LOGICO §4.6). Enums are complete from this first migration.

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

// Requisitos v1.2 §8.6: the activity is born sent (with its proof); RECUSADA is final, with no
// appeal: a new activity is registered (closed decision)
export const situacaoAtividade = pgEnum("situacao_atividade", ["EM_ANALISE", "DEVOLVIDA", "APROVADA", "RECUSADA"]);
export const decisaoAnalise = pgEnum("decisao_analise", ["APROVADA", "RECUSADA", "DEVOLVIDA"]);

// RF049, RF051, RF053, RF055, RN-19, RN-23: a complementary activity of the student. The
// minutes it counts are decided at approval by app.validar_analise_atividade (category limit
// and course total); content changes only while returned for complementation.
export const atividadeComplementar = pgTable(
  "atividade_complementar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estudanteId: uuid("estudante_id")
      .notNull()
      .references(() => estudante.id),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoriaAtividade.id),
    descricao: text("descricao").notNull(),
    instituicaoPromotora: text("instituicao_promotora").notNull(),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim").notNull(),
    horasDeclaradasMinutos: integer("horas_declaradas_minutos").notNull(),
    horasAproveitadasMinutos: integer("horas_aproveitadas_minutos"),
    situacao: situacaoAtividade("situacao").notNull().default("EM_ANALISE"),
    // RF046: a non-mandatory internship counted as complementary activity (DER §5.9)
    origemEstagioId: uuid("origem_estagio_id").references((): AnyPgColumn => estagio.id),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }).notNull().defaultNow(),
    registradaPorUsuarioId: uuid("registrada_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    // RN-36, RF047: one activity per internship; RECUSADA is left out so a new one can be registered
    uniqueIndex("atividade_uma_por_estagio")
      .on(t.origemEstagioId)
      .where(sql`${t.origemEstagioId} is not null and ${t.situacao} <> 'RECUSADA'`),
    // RF052 (second half): the same activity twice; the first half is the proof hash
    uniqueIndex("atividade_sem_duplicidade")
      .on(t.estudanteId, t.categoriaId, sql`lower(${t.instituicaoPromotora})`, sql`lower(${t.descricao})`, t.dataInicio, t.dataFim)
      .where(sql`${t.situacao} <> 'RECUSADA'`),
    index("atividade_estudante_situacao_idx").on(t.estudanteId, t.situacao),
    index("atividade_categoria_idx").on(t.categoriaId),
    index("atividade_fila_analise_idx").on(t.situacao, t.enviadaEm),
    index("atividade_registrada_por_idx").on(t.registradaPorUsuarioId),
    check("atividade_periodo_valido", sql`${t.dataFim} >= ${t.dataInicio}`),
    check("atividade_horas_declaradas_validas", sql`${t.horasDeclaradasMinutos} > 0`),
    check(
      "atividade_horas_aproveitadas_validas",
      sql`${t.horasAproveitadasMinutos} is null or ${t.horasAproveitadasMinutos} between 0 and ${t.horasDeclaradasMinutos}`,
    ),
    check("atividade_aprovada_com_horas", sql`(${t.situacao} = 'APROVADA') = (${t.horasAproveitadasMinutos} is not null)`),
  ],
);

// RF050, RF052, RN-21: the proofs of an activity. estudante_id and sha256 are copied by
// trigger from the activity and the document, so the same file is caught for the student.
export const comprovanteAtividade = pgTable(
  "comprovante_atividade",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    atividadeId: uuid("atividade_id")
      .notNull()
      .references(() => atividadeComplementar.id),
    estudanteId: uuid("estudante_id")
      .notNull()
      .references(() => estudante.id),
    documentoId: uuid("documento_id")
      .notNull()
      .unique()
      .references(() => documento.id),
    sha256: text("sha256").notNull(),
    // false when withdrawn on complementation (RF055) or the activity is refused, which frees the file
    valido: boolean("valido").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("comprovante_unico_por_estudante").on(t.estudanteId, t.sha256).where(sql`${t.valido}`),
    index("comprovante_atividade_idx").on(t.atividadeId),
    check("comprovante_sha256_formato", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
  ],
);

// RF051, RF054, RF055, RN-22, RN-28: each decision of the coordination, with date and time.
// On approval the trigger fills the minutes counted and the excess not counted (RF051).
export const analiseAtividade = pgTable(
  "analise_atividade",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    atividadeId: uuid("atividade_id")
      .notNull()
      .references(() => atividadeComplementar.id),
    decisao: decisaoAnalise("decisao").notNull(),
    motivo: text("motivo"),
    horasAproveitadasMinutos: integer("horas_aproveitadas_minutos"),
    minutosExcedentes: integer("minutos_excedentes"),
    motivoExcedente: text("motivo_excedente"),
    analisadoPorUsuarioId: uuid("analisado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("analise_atividade_idx").on(t.atividadeId, t.criadoEm),
    index("analise_analisado_por_idx").on(t.analisadoPorUsuarioId),
    check("analise_motivo_obrigatorio", sql`${t.decisao} = 'APROVADA' or ${t.motivo} is not null`),
    check("analise_horas_na_aprovacao", sql`(${t.decisao} = 'APROVADA') = (${t.horasAproveitadasMinutos} is not null)`),
    check("analise_excedente_na_aprovacao", sql`(${t.decisao} = 'APROVADA') = (${t.minutosExcedentes} is not null)`),
    check("analise_minutos_nao_negativos", sql`coalesce(${t.horasAproveitadasMinutos}, 0) >= 0 and coalesce(${t.minutosExcedentes}, 0) >= 0`),
    check("analise_excedente_explicado", sql`coalesce(${t.minutosExcedentes}, 0) = 0 or ${t.motivoExcedente} is not null`),
  ],
);
