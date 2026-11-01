-- RF005: allowed transitions of the academic situation (function in functions/04)
create or replace trigger validar_situacao_academica
  before insert or update of situacao_academica on public.estudante
  for each row execute function app.validar_situacao_academica();

-- RF004, RF006: audited, timestamps kept by the database, parameters immutable
create or replace trigger registrar_auditoria
  after insert or update or delete on public.parametro_institucional
  for each row execute function app.registrar_auditoria();

create or replace trigger bloquear_alteracao
  before update on public.parametro_institucional
  for each row execute function app.bloquear_alteracao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.categoria_atividade
  for each row execute function app.registrar_auditoria();

create or replace trigger definir_atualizado_em
  before update on public.categoria_atividade
  for each row execute function app.definir_atualizado_em();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.exigencia_categoria
  for each row execute function app.registrar_auditoria();

create or replace trigger definir_atualizado_em
  before update on public.exigencia_categoria
  for each row execute function app.definir_atualizado_em();
