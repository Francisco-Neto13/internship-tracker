import { sql } from "drizzle-orm";
import { bigint, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Append-only trail written by the app.registrar_auditoria() trigger, never by
// application code (RF065, RN-28). usuario_id has no FK so the trail stands alone. LEITURA
// rows record each read of a sensitive document (RF072, RN-38), written only by
// app.registrar_leitura_documento. titular_id is set only for what an administrator did as
// another account (RF003), filled by the trigger through app.titular_atual_id().
export const auditoria = pgTable(
  "auditoria",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
    usuarioId: uuid("usuario_id"),
    /** RF003: the administrator who acted as usuario_id through the profile switch. */
    titularId: uuid("titular_id"),
    tabela: text("tabela").notNull(),
    registroId: text("registro_id").notNull(),
    operacao: text("operacao").notNull(),
    dadosAnteriores: jsonb("dados_anteriores"),
    dadosNovos: jsonb("dados_novos"),
    camposAlterados: text("campos_alterados").array(),
  },
  (t) => [
    index("auditoria_tabela_registro_idx").on(t.tabela, t.registroId),
    index("auditoria_usuario_id_idx").on(t.usuarioId),
    index("auditoria_ocorrido_em_idx").on(t.ocorridoEm),
    check("auditoria_operacao_valida", sql`${t.operacao} in ('INSERT', 'UPDATE', 'DELETE', 'LEITURA')`),
  ],
);
