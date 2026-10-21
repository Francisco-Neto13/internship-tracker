import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usuario } from "./acesso";

export const situacaoAcademica = pgEnum("situacao_academica", ["MATRICULADO", "TRANCADO", "FORMADO", "DESLIGADO"]);

// Workloads are integer minutes so hour arithmetic stays exact (RF026, RN-34)
export const curso = pgTable(
  "curso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codigo: text("codigo").notNull().unique(),
    nome: text("nome").notNull(),
    cargaMinimaEstagioMinutos: integer("carga_minima_estagio_minutos").notNull(),
    cargaAtividadesComplementaresMinutos: integer("carga_atividades_complementares_minutos").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("curso_carga_minima_estagio_nao_negativa", sql`${t.cargaMinimaEstagioMinutos} >= 0`),
    check("curso_carga_complementares_nao_negativa", sql`${t.cargaAtividadesComplementaresMinutos} >= 0`),
  ],
);

export const estudante = pgTable(
  "estudante",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .unique()
      .references(() => usuario.id),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id),
    matricula: text("matricula").notNull().unique(),
    periodo: smallint("periodo").notNull(),
    situacaoAcademica: situacaoAcademica("situacao_academica").notNull().default("MATRICULADO"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("estudante_curso_id_idx").on(t.cursoId),
    check("estudante_periodo_valido", sql`${t.periodo} between 1 and 20`),
  ],
);

// RF006: institutional policies, versioned by start date and never updated. The policy in
// force on a date D is the row with the greatest vigencia_inicio <= D, so changing a
// parameter never recalculates what was validated before (DER-LOGICO §5.5).
export const parametroInstitucional = pgTable(
  "parametro_institucional",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vigenciaInicio: date("vigencia_inicio").notNull().unique(),
    limiteDiarioObrigatorioMinutos: integer("limite_diario_obrigatorio_minutos").notNull().default(360),
    limiteDiarioNaoObrigatorioMinutos: integer("limite_diario_nao_obrigatorio_minutos").notNull().default(360),
    limiteSemanalMinutos: integer("limite_semanal_minutos").notNull().default(1800),
    bloquearExcedente: boolean("bloquear_excedente").notNull().default(true),
    duracaoMaximaMeses: smallint("duracao_maxima_meses").notNull().default(24),
    toleranciaDivergenciaPercentual: numeric("tolerancia_divergencia_percentual", { precision: 5, scale: 2 })
      .notNull()
      .default("10.00"),
    prazoGuardaAnos: smallint("prazo_guarda_anos").notNull().default(5),
    antecedenciaAlertaConvenioDias: smallint("antecedencia_alerta_convenio_dias").notNull().default(60),
    definidoPorUsuarioId: uuid("definido_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("parametro_institucional_definido_por_idx").on(t.definidoPorUsuarioId),
    check(
      "parametro_limite_diario_valido",
      sql`${t.limiteDiarioObrigatorioMinutos} between 1 and 1440 and ${t.limiteDiarioNaoObrigatorioMinutos} between 1 and 1440`,
    ),
    check("parametro_limite_semanal_valido", sql`${t.limiteSemanalMinutos} between 1 and 10080`),
    check(
      "parametro_diario_ate_semanal",
      sql`${t.limiteDiarioObrigatorioMinutos} <= ${t.limiteSemanalMinutos} and ${t.limiteDiarioNaoObrigatorioMinutos} <= ${t.limiteSemanalMinutos}`,
    ),
    // Lei 11.788/2008, art. 11: at most 2 years at the same concedente
    check("parametro_duracao_maxima_valida", sql`${t.duracaoMaximaMeses} between 1 and 24`),
    check("parametro_tolerancia_valida", sql`${t.toleranciaDivergenciaPercentual} between 0 and 100`),
    check("parametro_prazo_guarda_valido", sql`${t.prazoGuardaAnos} >= 1`),
    check("parametro_alerta_convenio_valido", sql`${t.antecedenciaAlertaConvenioDias} >= 1`),
  ],
);

// RF004, RF048, RN-19: categories of complementary activities. Deactivated, never deleted.
export const categoriaAtividade = pgTable(
  "categoria_atividade",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    ativa: boolean("ativa").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categoria_atividade_nome_unique").on(sql`lower(${t.nome})`)],
);

// RF004, RN-23, RN-34: hour limit of each category in each course, and whether the course
// accepts a non-mandatory internship in that category (RN-18, RF046)
export const exigenciaCategoria = pgTable(
  "exigencia_categoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoriaAtividade.id),
    limiteMinutos: integer("limite_minutos").notNull(),
    admiteEstagioNaoObrigatorio: boolean("admite_estagio_nao_obrigatorio").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("exigencia_categoria_curso_categoria_unique").on(t.cursoId, t.categoriaId),
    index("exigencia_categoria_categoria_idx").on(t.categoriaId),
    // At most one destination category per course, so the double-count bar (RN-36) is checkable
    uniqueIndex("exigencia_categoria_um_destino_estagio")
      .on(t.cursoId)
      .where(sql`${t.admiteEstagioNaoObrigatorio}`),
    check("exigencia_categoria_limite_positivo", sql`${t.limiteMinutos} > 0`),
  ],
);
