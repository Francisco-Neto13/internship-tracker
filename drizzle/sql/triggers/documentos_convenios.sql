-- documento and convênios: audit, timestamps, immutability
create or replace trigger registrar_auditoria
  after insert or update or delete on public.documento
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.documento
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_documento
  before update on public.documento
  for each row execute function app.validar_alteracao_documento();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.convenio
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.convenio
  for each row execute function app.definir_atualizado_em();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.convenio_vigencia
  for each row execute function app.registrar_auditoria();
create or replace trigger bloquear_alteracao
  before update on public.convenio_vigencia
  for each row execute function app.bloquear_alteracao();
