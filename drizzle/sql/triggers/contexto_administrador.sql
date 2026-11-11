-- RF003, RN-28: each switch and its end enter the trail
create or replace trigger validar_contexto_administrador
  before insert or update on public.contexto_administrador
  for each row execute function app.validar_contexto_administrador();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.contexto_administrador
  for each row execute function app.registrar_auditoria();
