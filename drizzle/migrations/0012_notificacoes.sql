CREATE TYPE "public"."tipo_notificacao" AS ENUM('CONVENIO_A_VENCER', 'RELATORIO_PENDENTE', 'RELATORIO_ATRASADO', 'DIVERGENCIA_CARGA_HORARIA', 'SUBSTITUICAO_RESPONSAVEL', 'MUDANCA_SITUACAO', 'PRAZO_GUARDA_ATINGIDO', 'DURACAO_MAXIMA_ATINGIDA', 'RELATORIO_ANALISADO', 'ATIVIDADE_ANALISADA');--> statement-breakpoint
CREATE TABLE "notificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destinatario_usuario_id" uuid NOT NULL,
	"tipo" "tipo_notificacao" NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"entidade" text,
	"entidade_id" uuid,
	"chave_deduplicacao" text,
	"lida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notificacao_chave_deduplicacao_unique" UNIQUE("chave_deduplicacao"),
	CONSTRAINT "notificacao_entidade_completa" CHECK (("notificacao"."entidade" is null) = ("notificacao"."entidade_id" is null))
);
--> statement-breakpoint
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_destinatario_usuario_id_usuario_id_fk" FOREIGN KEY ("destinatario_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacao_destinatario_recente_idx" ON "notificacao" USING btree ("destinatario_usuario_id","criado_em" desc);--> statement-breakpoint
CREATE INDEX "notificacao_nao_lidas_idx" ON "notificacao" USING btree ("destinatario_usuario_id") WHERE "notificacao"."lida_em" is null;