CREATE TABLE "contexto_administrador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"administrador_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"sessao_id" uuid NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"encerrado_em" timestamp with time zone,
	CONSTRAINT "contexto_administrador_outra_conta" CHECK ("contexto_administrador"."administrador_id" <> "contexto_administrador"."usuario_id"),
	CONSTRAINT "contexto_administrador_encerramento_valido" CHECK ("contexto_administrador"."encerrado_em" is null or "contexto_administrador"."encerrado_em" >= "contexto_administrador"."iniciado_em")
);
--> statement-breakpoint
ALTER TABLE "contexto_administrador" ADD CONSTRAINT "contexto_administrador_administrador_id_usuario_id_fk" FOREIGN KEY ("administrador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contexto_administrador" ADD CONSTRAINT "contexto_administrador_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contexto_administrador_sessao_aberta" ON "contexto_administrador" USING btree ("sessao_id") WHERE "contexto_administrador"."encerrado_em" is null;--> statement-breakpoint
CREATE INDEX "contexto_administrador_administrador_idx" ON "contexto_administrador" USING btree ("administrador_id","iniciado_em" DESC NULLS LAST);