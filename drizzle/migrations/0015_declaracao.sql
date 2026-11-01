CREATE TYPE "public"."tipo_declaracao" AS ENUM('CONCLUSAO_ESTAGIO', 'INTEGRALIZACAO_ATIVIDADES');--> statement-breakpoint
CREATE TABLE "declaracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"tipo" "tipo_declaracao" NOT NULL,
	"estagio_id" uuid,
	"apuracao_id" uuid,
	"documento_id" uuid NOT NULL,
	"codigo_verificacao" text NOT NULL,
	"emitida_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "declaracao_documento_id_unique" UNIQUE("documento_id"),
	CONSTRAINT "declaracao_codigo_verificacao_unique" UNIQUE("codigo_verificacao"),
	CONSTRAINT "declaracao_estagio_do_tipo" CHECK (("declaracao"."tipo" = 'CONCLUSAO_ESTAGIO') = ("declaracao"."estagio_id" is not null)),
	CONSTRAINT "declaracao_apuracao_do_tipo" CHECK (("declaracao"."tipo" = 'INTEGRALIZACAO_ATIVIDADES') = ("declaracao"."apuracao_id" is not null)),
	CONSTRAINT "declaracao_codigo_formato" CHECK ("declaracao"."codigo_verificacao" ~ '^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$')
);
--> statement-breakpoint
ALTER TABLE "declaracao" ADD CONSTRAINT "declaracao_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaracao" ADD CONSTRAINT "declaracao_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaracao" ADD CONSTRAINT "declaracao_apuracao_id_apuracao_integralizacao_id_fk" FOREIGN KEY ("apuracao_id") REFERENCES "public"."apuracao_integralizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaracao" ADD CONSTRAINT "declaracao_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaracao" ADD CONSTRAINT "declaracao_emitida_por_usuario_id_usuario_id_fk" FOREIGN KEY ("emitida_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "declaracao_estudante_idx" ON "declaracao" USING btree ("estudante_id");--> statement-breakpoint
CREATE INDEX "declaracao_estagio_idx" ON "declaracao" USING btree ("estagio_id");--> statement-breakpoint
CREATE INDEX "declaracao_apuracao_idx" ON "declaracao" USING btree ("apuracao_id");--> statement-breakpoint
CREATE INDEX "declaracao_emitida_por_idx" ON "declaracao" USING btree ("emitida_por_usuario_id");