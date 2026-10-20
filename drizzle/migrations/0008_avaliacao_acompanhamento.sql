CREATE TYPE "public"."momento_avaliacao" AS ENUM('PERIODICA', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."tipo_acompanhamento" AS ENUM('VISITA', 'CONTATO', 'REUNIAO');--> statement-breakpoint
CREATE TABLE "acompanhamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"tipo" "tipo_acompanhamento" NOT NULL,
	"data_ocorrencia" date NOT NULL,
	"participantes" text NOT NULL,
	"observacoes" text NOT NULL,
	"registrado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacao_desempenho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"momento" "momento_avaliacao" NOT NULL,
	"periodo_inicio" date,
	"periodo_fim" date,
	"observacoes" text,
	"avaliador_usuario_id" uuid NOT NULL,
	"avaliador_perfil" "perfil" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacao_periodo_valido" CHECK ("avaliacao_desempenho"."momento" = 'FINAL' or ("avaliacao_desempenho"."periodo_inicio" is not null and "avaliacao_desempenho"."periodo_fim" >= "avaliacao_desempenho"."periodo_inicio")),
	CONSTRAINT "avaliacao_perfil_avaliador" CHECK ("avaliacao_desempenho"."avaliador_perfil" in ('SUPERVISOR', 'CONCEDENTE'))
);
--> statement-breakpoint
CREATE TABLE "criterio_avaliacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"descricao" text NOT NULL,
	"escala_minima" smallint NOT NULL,
	"escala_maxima" smallint NOT NULL,
	"ordem" smallint DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "criterio_avaliacao_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "criterio_escala_valida" CHECK ("criterio_avaliacao"."escala_minima" >= 0 and "criterio_avaliacao"."escala_maxima" > "criterio_avaliacao"."escala_minima" and "criterio_avaliacao"."escala_maxima" <= 100)
);
--> statement-breakpoint
CREATE TABLE "resposta_avaliacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avaliacao_id" uuid NOT NULL,
	"criterio_id" uuid NOT NULL,
	"nota" smallint NOT NULL,
	"comentario" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acompanhamento" ADD CONSTRAINT "acompanhamento_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acompanhamento" ADD CONSTRAINT "acompanhamento_registrado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_avaliador_usuario_id_usuario_id_fk" FOREIGN KEY ("avaliador_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resposta_avaliacao" ADD CONSTRAINT "resposta_avaliacao_avaliacao_id_avaliacao_desempenho_id_fk" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacao_desempenho"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resposta_avaliacao" ADD CONSTRAINT "resposta_avaliacao_criterio_id_criterio_avaliacao_id_fk" FOREIGN KEY ("criterio_id") REFERENCES "public"."criterio_avaliacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acompanhamento_estagio_data_idx" ON "acompanhamento" USING btree ("estagio_id","data_ocorrencia");--> statement-breakpoint
CREATE INDEX "acompanhamento_registrado_por_idx" ON "acompanhamento" USING btree ("registrado_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacao_uma_final" ON "avaliacao_desempenho" USING btree ("estagio_id") WHERE "avaliacao_desempenho"."momento" = 'FINAL';--> statement-breakpoint
CREATE INDEX "avaliacao_estagio_idx" ON "avaliacao_desempenho" USING btree ("estagio_id");--> statement-breakpoint
CREATE INDEX "avaliacao_avaliador_idx" ON "avaliacao_desempenho" USING btree ("avaliador_usuario_id");--> statement-breakpoint
CREATE INDEX "criterio_avaliacao_ativo_ordem_idx" ON "criterio_avaliacao" USING btree ("ativo","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "resposta_avaliacao_criterio_unique" ON "resposta_avaliacao" USING btree ("avaliacao_id","criterio_id");--> statement-breakpoint
CREATE INDEX "resposta_avaliacao_criterio_idx" ON "resposta_avaliacao" USING btree ("criterio_id");