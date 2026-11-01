import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categoriaAtividade, curso, estudante } from "./academico";

// M07 Integralização (DER-LOGICO §4.7). Each assessment is a new, immutable row calculated by
// app.apurar_integralizacao from audited tables; the one in force is the latest of the student.

export const situacaoIntegralizacao = pgEnum("situacao_integralizacao", ["CUMPRIDO", "PENDENTE"]);
export const situacaoCategoriaIntegralizacao = pgEnum("situacao_categoria_integralizacao", ["EM_ANDAMENTO", "LIMITE_ATINGIDO"]);
export const gatilhoApuracao = pgEnum("gatilho_apuracao", [
  "ATIVIDADE_APROVADA",
  "ESTAGIO_CONCLUIDO",
  "ESTAGIO_RESCINDIDO",
  "EXIGENCIA_ALTERADA",
  "ROTINA",
  "MANUAL",
]);

// RF056, RF057, RN-24, RN-35: mandatory internship concluded and complementary activities
// approved, against what the course requires (DER §5.10)
export const apuracaoIntegralizacao = pgTable(
  "apuracao_integralizacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estudanteId: uuid("estudante_id")
      .notNull()
      .references(() => estudante.id),
    // Course of the assessment (D7: internships of another course do not count)
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id),
    gatilho: gatilhoApuracao("gatilho").notNull(),
    estagioObrigatorioExigidoMinutos: integer("estagio_obrigatorio_exigido_minutos").notNull(),
    estagioObrigatorioConcluidoMinutos: integer("estagio_obrigatorio_concluido_minutos").notNull(),
    situacaoEstagio: situacaoIntegralizacao("situacao_estagio").notNull(),
    atividadesExigidoMinutos: integer("atividades_exigido_minutos").notNull(),
    atividadesAproveitadoMinutos: integer("atividades_aproveitado_minutos").notNull(),
    situacaoAtividades: situacaoIntegralizacao("situacao_atividades").notNull(),
    situacaoGeral: situacaoIntegralizacao("situacao_geral").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("apuracao_estudante_recente_idx").on(t.estudanteId, sql`${t.criadoEm} desc`),
    index("apuracao_curso_idx").on(t.cursoId),
    check("apuracao_minutos_nao_negativos", sql`${t.estagioObrigatorioExigidoMinutos} >= 0 and ${t.estagioObrigatorioConcluidoMinutos} >= 0 and ${t.atividadesExigidoMinutos} >= 0`),
    // RN-23: the total counted respects what the course requires
    check("apuracao_atividades_no_limite", sql`${t.atividadesAproveitadoMinutos} between 0 and ${t.atividadesExigidoMinutos}`),
    check(
      "apuracao_situacao_estagio",
      sql`(${t.situacaoEstagio} = 'CUMPRIDO') = (${t.estagioObrigatorioConcluidoMinutos} >= ${t.estagioObrigatorioExigidoMinutos})`,
    ),
    check("apuracao_situacao_atividades", sql`(${t.situacaoAtividades} = 'CUMPRIDO') = (${t.atividadesAproveitadoMinutos} = ${t.atividadesExigidoMinutos})`),
    check(
      "apuracao_situacao_geral",
      sql`(${t.situacaoGeral} = 'CUMPRIDO') = (${t.situacaoEstagio} = 'CUMPRIDO' and ${t.situacaoAtividades} = 'CUMPRIDO')`,
    ),
  ],
);

// RF057, RN-23: the categories of the course in the assessment, each within its limit
export const apuracaoCategoria = pgTable(
  "apuracao_categoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apuracaoId: uuid("apuracao_id")
      .notNull()
      .references(() => apuracaoIntegralizacao.id),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoriaAtividade.id),
    limiteMinutos: integer("limite_minutos").notNull(),
    aproveitadoMinutos: integer("aproveitado_minutos").notNull(),
    situacao: situacaoCategoriaIntegralizacao("situacao").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("apuracao_categoria_unique").on(t.apuracaoId, t.categoriaId),
    index("apuracao_categoria_categoria_idx").on(t.categoriaId),
    check("apuracao_categoria_limite_positivo", sql`${t.limiteMinutos} > 0`),
    check("apuracao_categoria_no_limite", sql`${t.aproveitadoMinutos} between 0 and ${t.limiteMinutos}`),
    check("apuracao_categoria_situacao", sql`(${t.situacao} = 'LIMITE_ATINGIDO') = (${t.aproveitadoMinutos} = ${t.limiteMinutos})`),
  ],
);
