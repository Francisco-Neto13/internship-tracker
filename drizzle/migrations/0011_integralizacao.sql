CREATE TYPE "public"."gatilho_apuracao" AS ENUM('ATIVIDADE_APROVADA', 'ESTAGIO_CONCLUIDO', 'ESTAGIO_RESCINDIDO', 'EXIGENCIA_ALTERADA', 'ROTINA', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."situacao_categoria_integralizacao" AS ENUM('EM_ANDAMENTO', 'LIMITE_ATINGIDO');--> statement-breakpoint
CREATE TYPE "public"."situacao_integralizacao" AS ENUM('CUMPRIDO', 'PENDENTE');--> statement-breakpoint
CREATE TABLE "apuracao_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apuracao_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"limite_minutos" integer NOT NULL,
	"aproveitado_minutos" integer NOT NULL,
	"situacao" "situacao_categoria_integralizacao" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apuracao_categoria_limite_positivo" CHECK ("apuracao_categoria"."limite_minutos" > 0),
	CONSTRAINT "apuracao_categoria_no_limite" CHECK ("apuracao_categoria"."aproveitado_minutos" between 0 and "apuracao_categoria"."limite_minutos"),
	CONSTRAINT "apuracao_categoria_situacao" CHECK (("apuracao_categoria"."situacao" = 'LIMITE_ATINGIDO') = ("apuracao_categoria"."aproveitado_minutos" = "apuracao_categoria"."limite_minutos"))
);
--> statement-breakpoint
CREATE TABLE "apuracao_integralizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	"gatilho" "gatilho_apuracao" NOT NULL,
	"estagio_obrigatorio_exigido_minutos" integer NOT NULL,
	"estagio_obrigatorio_concluido_minutos" integer NOT NULL,
	"situacao_estagio" "situacao_integralizacao" NOT NULL,
	"atividades_exigido_minutos" integer NOT NULL,
	"atividades_aproveitado_minutos" integer NOT NULL,
	"situacao_atividades" "situacao_integralizacao" NOT NULL,
	"situacao_geral" "situacao_integralizacao" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apuracao_minutos_nao_negativos" CHECK ("apuracao_integralizacao"."estagio_obrigatorio_exigido_minutos" >= 0 and "apuracao_integralizacao"."estagio_obrigatorio_concluido_minutos" >= 0 and "apuracao_integralizacao"."atividades_exigido_minutos" >= 0),
	CONSTRAINT "apuracao_atividades_no_limite" CHECK ("apuracao_integralizacao"."atividades_aproveitado_minutos" between 0 and "apuracao_integralizacao"."atividades_exigido_minutos"),
	CONSTRAINT "apuracao_situacao_estagio" CHECK (("apuracao_integralizacao"."situacao_estagio" = 'CUMPRIDO') = ("apuracao_integralizacao"."estagio_obrigatorio_concluido_minutos" >= "apuracao_integralizacao"."estagio_obrigatorio_exigido_minutos")),
	CONSTRAINT "apuracao_situacao_atividades" CHECK (("apuracao_integralizacao"."situacao_atividades" = 'CUMPRIDO') = ("apuracao_integralizacao"."atividades_aproveitado_minutos" = "apuracao_integralizacao"."atividades_exigido_minutos")),
	CONSTRAINT "apuracao_situacao_geral" CHECK (("apuracao_integralizacao"."situacao_geral" = 'CUMPRIDO') = ("apuracao_integralizacao"."situacao_estagio" = 'CUMPRIDO' and "apuracao_integralizacao"."situacao_atividades" = 'CUMPRIDO'))
);
--> statement-breakpoint
ALTER TABLE "apuracao_categoria" ADD CONSTRAINT "apuracao_categoria_apuracao_id_apuracao_integralizacao_id_fk" FOREIGN KEY ("apuracao_id") REFERENCES "public"."apuracao_integralizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apuracao_categoria" ADD CONSTRAINT "apuracao_categoria_categoria_id_categoria_atividade_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria_atividade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apuracao_integralizacao" ADD CONSTRAINT "apuracao_integralizacao_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apuracao_integralizacao" ADD CONSTRAINT "apuracao_integralizacao_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "apuracao_categoria_unique" ON "apuracao_categoria" USING btree ("apuracao_id","categoria_id");--> statement-breakpoint
CREATE INDEX "apuracao_categoria_categoria_idx" ON "apuracao_categoria" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "apuracao_estudante_recente_idx" ON "apuracao_integralizacao" USING btree ("estudante_id","criado_em" desc);--> statement-breakpoint
CREATE INDEX "apuracao_curso_idx" ON "apuracao_integralizacao" USING btree ("curso_id");