-- Guarda documental (RF069): retention dates set at the end of each scope, and no DELETE of a
-- document row, whoever tries it (functions/18_guarda.sql)
create or replace trigger definir_guarda_documento
  before insert on public.documento
  for each row execute function app.definir_guarda_documento();
create or replace trigger bloquear_exclusao_documento
  before delete on public.documento
  for each row execute function app.bloquear_exclusao_documento();
create or replace trigger definir_guarda_estudante
  after update of situacao_academica on public.estudante
  for each row execute function app.definir_guarda_estudante();
create or replace trigger definir_guarda_convenio
  after insert on public.convenio_vigencia
  for each row execute function app.definir_guarda_convenio();
