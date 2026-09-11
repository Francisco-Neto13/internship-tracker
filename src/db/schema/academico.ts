import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
