-- M05 Relatórios: audit, timestamps and the flow of functions/09_relatorios.sql
create or replace trigger registrar_auditoria
  after insert or update or delete on public.periodicidade_relatorio
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.periodicidade_relatorio
  for each row execute function app.definir_atualizado_em();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.relatorio
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.relatorio
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_relatorio
  before update on public.relatorio
  for each row execute function app.validar_alteracao_relatorio();

-- Activation and new planned end (amendment, leave) generate or move the pending reports
create or replace trigger gerar_relatorios
  after update of situacao, data_fim_prevista on public.estagio
  for each row execute function app.gerar_relatorios_do_estagio();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.versao_relatorio
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_versao_relatorio
  before insert on public.versao_relatorio
  for each row execute function app.validar_versao_relatorio();
create or replace trigger relatorio_enviado
  after insert on public.versao_relatorio
  for each row execute function app.relatorio_enviado();
create or replace trigger bloquear_alteracao
  before update on public.versao_relatorio
  for each row execute function app.bloquear_alteracao();
drop trigger if exists exigir_conteudo_versao on public.versao_relatorio;
create constraint trigger exigir_conteudo_versao
  after insert on public.versao_relatorio
  deferrable initially deferred
  for each row execute function app.exigir_conteudo_versao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.anexo_relatorio
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_anexo_relatorio
  before insert on public.anexo_relatorio
  for each row execute function app.validar_anexo_relatorio();
create or replace trigger bloquear_alteracao
  before update on public.anexo_relatorio
  for each row execute function app.bloquear_alteracao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.parecer_relatorio
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_parecer_relatorio
  before insert on public.parecer_relatorio
  for each row execute function app.validar_parecer_relatorio();
create or replace trigger aplicar_parecer_relatorio
  after insert on public.parecer_relatorio
  for each row execute function app.aplicar_parecer_relatorio();
create or replace trigger bloquear_alteracao
  before update on public.parecer_relatorio
  for each row execute function app.bloquear_alteracao();

-- Internships already ATIVO before 0007 get their reports once (idempotent on every migration)
select app.gerar_relatorios(g.id)
from public.estagio g
where g.situacao = 'ATIVO' and not exists (select 1 from public.relatorio r where r.estagio_id = g.id);
