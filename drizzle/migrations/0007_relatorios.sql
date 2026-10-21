CREATE TYPE "public"."decisao_parecer" AS ENUM('APROVADO', 'DEVOLVIDO');--> statement-breakpoint
CREATE TYPE "public"."situacao_relatorio" AS ENUM('PENDENTE', 'EM_ANALISE', 'DEVOLVIDO', 'APROVADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_relatorio" AS ENUM('PERIODICO', 'FINAL');--> statement-breakpoint
CREATE TABLE "periodicidade_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"tipo_estagio" "tipo_estagio" NOT NULL,
	"intervalo_meses" smallint NOT NULL,
	"prazo_entrega_dias" smallint NOT NULL,
	"prazo_relatorio_final_dias" smallint NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periodicidade_intervalo_valido" CHECK ("periodicidade_relatorio"."intervalo_meses" between 1 and 6),
	CONSTRAINT "periodicidade_prazo_entrega_valido" CHECK ("periodicidade_relatorio"."prazo_entrega_dias" between 0 and 90),
	CONSTRAINT "periodicidade_prazo_final_valido" CHECK ("periodicidade_relatorio"."prazo_relatorio_final_dias" between 0 and 90)
);
--> statement-breakpoint
CREATE TABLE "anexo_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao_relatorio_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anexo_relatorio_documento_id_unique" UNIQUE("documento_id")
);
--> statement-breakpoint
CREATE TABLE "parecer_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao_relatorio_id" uuid NOT NULL,
	"decisao" "decisao_parecer" NOT NULL,
	"texto" text,
	"emitido_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parecer_relatorio_versao_relatorio_id_unique" UNIQUE("versao_relatorio_id"),
	CONSTRAINT "parecer_devolucao_com_texto" CHECK ("parecer_relatorio"."decisao" <> 'DEVOLVIDO' or "parecer_relatorio"."texto" is not null)
);
--> statement-breakpoint
CREATE TABLE "relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"tipo" "tipo_relatorio" NOT NULL,
	"sequencia" smallint NOT NULL,
	"periodo_inicio" date,
	"periodo_fim" date,
	"prazo_entrega" date NOT NULL,
	"situacao" "situacao_relatorio" DEFAULT 'PENDENTE' NOT NULL,
	"aprovado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relatorio_sequencia_positiva" CHECK ("relatorio"."sequencia" >= 1),
	CONSTRAINT "relatorio_periodo_valido" CHECK ("relatorio"."tipo" = 'FINAL' or ("relatorio"."periodo_inicio" is not null and "relatorio"."periodo_fim" >= "relatorio"."periodo_inicio")),
	CONSTRAINT "relatorio_aprovacao_consistente" CHECK (("relatorio"."situacao" = 'APROVADO') = ("relatorio"."aprovado_em" is not null))
);
--> statement-breakpoint
CREATE TABLE "versao_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relatorio_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"conteudo" text,
	"enviado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "versao_relatorio_numero_positivo" CHECK ("versao_relatorio"."numero" >= 1)
);
--> statement-breakpoint
ALTER TABLE "periodicidade_relatorio" ADD CONSTRAINT "periodicidade_relatorio_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexo_relatorio" ADD CONSTRAINT "anexo_relatorio_versao_relatorio_id_versao_relatorio_id_fk" FOREIGN KEY ("versao_relatorio_id") REFERENCES "public"."versao_relatorio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexo_relatorio" ADD CONSTRAINT "anexo_relatorio_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parecer_relatorio" ADD CONSTRAINT "parecer_relatorio_versao_relatorio_id_versao_relatorio_id_fk" FOREIGN KEY ("versao_relatorio_id") REFERENCES "public"."versao_relatorio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parecer_relatorio" ADD CONSTRAINT "parecer_relatorio_emitido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("emitido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorio" ADD CONSTRAINT "relatorio_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_relatorio" ADD CONSTRAINT "versao_relatorio_relatorio_id_relatorio_id_fk" FOREIGN KEY ("relatorio_id") REFERENCES "public"."relatorio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versao_relatorio" ADD CONSTRAINT "versao_relatorio_enviado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("enviado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "periodicidade_curso_tipo_unique" ON "periodicidade_relatorio" USING btree ("curso_id","tipo_estagio");--> statement-breakpoint
CREATE INDEX "anexo_relatorio_versao_idx" ON "anexo_relatorio" USING btree ("versao_relatorio_id");--> statement-breakpoint
CREATE INDEX "parecer_relatorio_emitido_por_idx" ON "parecer_relatorio" USING btree ("emitido_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "relatorio_estagio_tipo_sequencia_unique" ON "relatorio" USING btree ("estagio_id","tipo","sequencia");--> statement-breakpoint
CREATE UNIQUE INDEX "relatorio_um_final" ON "relatorio" USING btree ("estagio_id") WHERE "relatorio"."tipo" = 'FINAL';--> statement-breakpoint
CREATE INDEX "relatorio_situacao_prazo_idx" ON "relatorio" USING btree ("situacao","prazo_entrega");--> statement-breakpoint
CREATE UNIQUE INDEX "versao_relatorio_numero_unique" ON "versao_relatorio" USING btree ("relatorio_id","numero");--> statement-breakpoint
CREATE INDEX "versao_relatorio_enviado_por_idx" ON "versao_relatorio" USING btree ("enviado_por_usuario_id");