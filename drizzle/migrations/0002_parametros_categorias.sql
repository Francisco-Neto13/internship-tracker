CREATE TABLE "categoria_atividade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exigencia_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"limite_minutos" integer NOT NULL,
	"admite_estagio_nao_obrigatorio" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exigencia_categoria_limite_positivo" CHECK ("exigencia_categoria"."limite_minutos" > 0)
);
--> statement-breakpoint
CREATE TABLE "parametro_institucional" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"limite_diario_obrigatorio_minutos" integer DEFAULT 360 NOT NULL,
	"limite_diario_nao_obrigatorio_minutos" integer DEFAULT 360 NOT NULL,
	"limite_semanal_minutos" integer DEFAULT 1800 NOT NULL,
	"bloquear_excedente" boolean DEFAULT true NOT NULL,
	"duracao_maxima_meses" smallint DEFAULT 24 NOT NULL,
	"tolerancia_divergencia_percentual" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"prazo_guarda_anos" smallint DEFAULT 5 NOT NULL,
	"antecedencia_alerta_convenio_dias" smallint DEFAULT 60 NOT NULL,
	"definido_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parametro_institucional_vigencia_inicio_unique" UNIQUE("vigencia_inicio"),
	CONSTRAINT "parametro_limite_diario_valido" CHECK ("parametro_institucional"."limite_diario_obrigatorio_minutos" between 1 and 1440 and "parametro_institucional"."limite_diario_nao_obrigatorio_minutos" between 1 and 1440),
	CONSTRAINT "parametro_limite_semanal_valido" CHECK ("parametro_institucional"."limite_semanal_minutos" between 1 and 10080),
	CONSTRAINT "parametro_diario_ate_semanal" CHECK ("parametro_institucional"."limite_diario_obrigatorio_minutos" <= "parametro_institucional"."limite_semanal_minutos" and "parametro_institucional"."limite_diario_nao_obrigatorio_minutos" <= "parametro_institucional"."limite_semanal_minutos"),
	CONSTRAINT "parametro_duracao_maxima_valida" CHECK ("parametro_institucional"."duracao_maxima_meses" between 1 and 24),
	CONSTRAINT "parametro_tolerancia_valida" CHECK ("parametro_institucional"."tolerancia_divergencia_percentual" between 0 and 100),
	CONSTRAINT "parametro_prazo_guarda_valido" CHECK ("parametro_institucional"."prazo_guarda_anos" >= 1),
	CONSTRAINT "parametro_alerta_convenio_valido" CHECK ("parametro_institucional"."antecedencia_alerta_convenio_dias" >= 1)
);
--> statement-breakpoint
ALTER TABLE "exigencia_categoria" ADD CONSTRAINT "exigencia_categoria_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exigencia_categoria" ADD CONSTRAINT "exigencia_categoria_categoria_id_categoria_atividade_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria_atividade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametro_institucional" ADD CONSTRAINT "parametro_institucional_definido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("definido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categoria_atividade_nome_unique" ON "categoria_atividade" USING btree (lower("nome"));--> statement-breakpoint
CREATE UNIQUE INDEX "exigencia_categoria_curso_categoria_unique" ON "exigencia_categoria" USING btree ("curso_id","categoria_id");--> statement-breakpoint
CREATE INDEX "exigencia_categoria_categoria_idx" ON "exigencia_categoria" USING btree ("categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exigencia_categoria_um_destino_estagio" ON "exigencia_categoria" USING btree ("curso_id") WHERE "exigencia_categoria"."admite_estagio_nao_obrigatorio";--> statement-breakpoint
CREATE INDEX "parametro_institucional_definido_por_idx" ON "parametro_institucional" USING btree ("definido_por_usuario_id");