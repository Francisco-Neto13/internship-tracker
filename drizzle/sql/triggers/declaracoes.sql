-- M07 Declarações: audit and the rules of functions/20_declaracoes.sql
create or replace trigger registrar_auditoria
  after insert or update or delete on public.declaracao
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_declaracao
  before insert on public.declaracao
  for each row execute function app.validar_declaracao();
create or replace trigger bloquear_alteracao
  before update on public.declaracao
  for each row execute function app.bloquear_alteracao();
