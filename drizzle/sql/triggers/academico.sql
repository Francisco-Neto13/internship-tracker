-- RF005: allowed transitions of the academic situation (function in functions/04)
create or replace trigger validar_situacao_academica
  before insert or update of situacao_academica on public.estudante
  for each row execute function app.validar_situacao_academica();
