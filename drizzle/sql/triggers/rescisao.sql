-- M04 Encerramento: audit and the rules of functions/17_encerramento.sql
create or replace trigger registrar_auditoria
  after insert or update or delete on public.rescisao
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_rescisao
  before insert on public.rescisao
  for each row execute function app.validar_rescisao();
create or replace trigger aplicar_rescisao
  after insert on public.rescisao
  for each row execute function app.aplicar_rescisao();
create or replace trigger bloquear_alteracao_rescisao
  before update on public.rescisao
  for each row execute function app.bloquear_alteracao_rescisao();

-- Named to fire after notificar_situacao_estagio (AFTER triggers run in name order)
create or replace trigger registrar_encerramento
  after update of situacao on public.estagio
  for each row execute function app.encerrar_estagio();
