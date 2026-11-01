-- M06 Atividades complementares: audit, timestamps and the rules of functions/13_atividades.sql
create or replace trigger registrar_auditoria
  after insert or update or delete on public.atividade_complementar
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.atividade_complementar
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_atividade
  before insert or update on public.atividade_complementar
  for each row execute function app.validar_atividade();
drop trigger if exists exigir_comprovante_atividade on public.atividade_complementar;
create constraint trigger exigir_comprovante_atividade
  after insert or update on public.atividade_complementar
  deferrable initially deferred
  for each row execute function app.exigir_comprovante_atividade();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.comprovante_atividade
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.comprovante_atividade
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_comprovante_atividade
  before insert or update on public.comprovante_atividade
  for each row execute function app.validar_comprovante_atividade();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.analise_atividade
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_analise_atividade
  before insert on public.analise_atividade
  for each row execute function app.validar_analise_atividade();
create or replace trigger aplicar_analise_atividade
  after insert on public.analise_atividade
  for each row execute function app.aplicar_analise_atividade();
create or replace trigger bloquear_alteracao
  before update on public.analise_atividade
  for each row execute function app.bloquear_alteracao();
