-- M04 Afastamento: audit, timestamps and the rules of functions/16_afastamento.sql.
-- Constraint triggers have no OR REPLACE, so they are dropped and created again.
create or replace trigger registrar_auditoria
  after insert or update or delete on public.afastamento
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.afastamento
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_afastamento
  before insert on public.afastamento
  for each row execute function app.validar_afastamento();
create or replace trigger validar_alteracao_afastamento
  before update on public.afastamento
  for each row execute function app.validar_alteracao_afastamento();
create or replace trigger aplicar_afastamento
  after insert on public.afastamento
  for each row execute function app.aplicar_afastamento();
drop trigger if exists exigir_substituto_afastamento on public.afastamento;
create constraint trigger exigir_substituto_afastamento
  after update on public.afastamento
  deferrable initially deferred
  for each row execute function app.exigir_substituto_afastamento();
