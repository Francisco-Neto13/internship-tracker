CREATE TYPE "public"."parte_rescisao" AS ENUM('ESTUDANTE', 'CONCEDENTE', 'INSTITUICAO');--> statement-breakpoint
CREATE TABLE "rescisao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"data_rescisao" date NOT NULL,
	"solicitante" "parte_rescisao" NOT NULL,
	"motivo" text NOT NULL,
	"minutos_cumpridos_consolidados" integer NOT NULL,
	"minutos_homologados_consolidados" integer NOT NULL,
	"documento_id" uuid,
	"decidido_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rescisao_estagio_id_unique" UNIQUE("estagio_id"),
	CONSTRAINT "rescisao_cumpridos_validos" CHECK ("rescisao"."minutos_cumpridos_consolidados" >= 0),
	CONSTRAINT "rescisao_homologados_validos" CHECK ("rescisao"."minutos_homologados_consolidados" between 0 and "rescisao"."minutos_cumpridos_consolidados"),
	CONSTRAINT "rescisao_motivo_informado" CHECK (length(trim("rescisao"."motivo")) > 0)
);
--> statement-breakpoint
ALTER TABLE "rescisao" ADD CONSTRAINT "rescisao_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rescisao" ADD CONSTRAINT "rescisao_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rescisao" ADD CONSTRAINT "rescisao_decidido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("decidido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rescisao_decidido_por_idx" ON "rescisao" USING btree ("decidido_por_usuario_id");--> statement-breakpoint
CREATE INDEX "rescisao_documento_idx" ON "rescisao" USING btree ("documento_id");