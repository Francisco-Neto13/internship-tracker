import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./acesso";

// Transversal (DER-LOGICO §4.9): in-system notifications only, no e-mail (closed decision).
// Written by app.notificar (events, by trigger) and by the daily routine; read and marked as
// read only by the recipient. Not audited: the fact that caused it is audited at its source.

export const tipoNotificacao = pgEnum("tipo_notificacao", [
  "CONVENIO_A_VENCER",
  "RELATORIO_PENDENTE",
  "RELATORIO_ATRASADO",
  "DIVERGENCIA_CARGA_HORARIA",
  "SUBSTITUICAO_RESPONSAVEL",
  "MUDANCA_SITUACAO",
  "PRAZO_GUARDA_ATINGIDO",
  "DURACAO_MAXIMA_ATINGIDA",
  "RELATORIO_ANALISADO",
  "ATIVIDADE_ANALISADA",
  "RECUPERACAO_SENHA",
]);

export const notificacao = pgTable(
  "notificacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinatarioUsuarioId: uuid("destinatario_usuario_id")
      .notNull()
      .references(() => usuario.id),
    tipo: tipoNotificacao("tipo").notNull(),
    titulo: text("titulo").notNull(),
    // Never health data nor report content (RN-38): it says what happened and where to look
    mensagem: text("mensagem").notNull(),
    entidade: text("entidade"),
    entidadeId: uuid("entidade_id"),
    // Routines never repeat the same alert (e.g. RF012:<convenio_vigencia_id>:<recipient>)
    chaveDeduplicacao: text("chave_deduplicacao").unique(),
    lidaEm: timestamp("lida_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notificacao_destinatario_recente_idx").on(t.destinatarioUsuarioId, sql`${t.criadoEm} desc`),
    index("notificacao_nao_lidas_idx").on(t.destinatarioUsuarioId).where(sql`${t.lidaEm} is null`),
    check("notificacao_entidade_completa", sql`(${t.entidade} is null) = (${t.entidadeId} is null)`),
  ],
);
