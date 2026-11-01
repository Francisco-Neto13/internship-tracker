CREATE TYPE "public"."situacao_afastamento" AS ENUM('VALIDO', 'SUBSTITUIDO');--> statement-breakpoint
CREATE TYPE "public"."tipo_afastamento" AS ENUM('LICENCA', 'ATESTADO_MEDICO', 'OUTRO');--> statement-breakpoint
CREATE TABLE "afastamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"tipo" "tipo_afastamento" NOT NULL,
	"descricao" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"dias_corridos" integer GENERATED ALWAYS AS (data_fim - data_inicio + 1) STORED NOT NULL,
	"dias_extensao" integer NOT NULL,
	"data_fim_prevista_anterior" date NOT NULL,
	"data_fim_prevista_nova" date NOT NULL,
	"documento_id" uuid NOT NULL,
	"situacao" "situacao_afastamento" DEFAULT 'VALIDO' NOT NULL,
	"substitui_afastamento_id" uuid,
	"justificativa_substituicao" text,
	"registrado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "afastamento_substitui_afastamento_id_unique" UNIQUE("substitui_afastamento_id"),
	CONSTRAINT "afastamento_periodo_valido" CHECK ("afastamento"."data_fim" >= "afastamento"."data_inicio"),
	CONSTRAINT "afastamento_outro_descrito" CHECK ("afastamento"."tipo" <> 'OUTRO' or "afastamento"."descricao" is not null),
	CONSTRAINT "afastamento_extensao_valida" CHECK ("afastamento"."dias_extensao" between 0 and "afastamento"."data_fim" - "afastamento"."data_inicio" + 1),
	CONSTRAINT "afastamento_nova_data" CHECK ("afastamento"."data_fim_prevista_nova" = "afastamento"."data_fim_prevista_anterior" + "afastamento"."dias_extensao"),
	CONSTRAINT "afastamento_substituicao_justificada" CHECK ("afastamento"."substitui_afastamento_id" is null or "afastamento"."justificativa_substituicao" is not null)
);
--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_substitui_afastamento_id_afastamento_id_fk" FOREIGN KEY ("substitui_afastamento_id") REFERENCES "public"."afastamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_registrado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "afastamento_estagio_periodo_idx" ON "afastamento" USING btree ("estagio_id","data_inicio","data_fim");--> statement-breakpoint
CREATE INDEX "afastamento_documento_idx" ON "afastamento" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "afastamento_registrado_por_idx" ON "afastamento" USING btree ("registrado_por_usuario_id");--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_sem_sobreposicao" EXCLUDE USING gist ("estagio_id" WITH =, daterange("data_inicio", "data_fim", '[]') WITH &&) WHERE ("situacao" = 'VALIDO');
