-- M03 Concedentes: audit, timestamps, immutable history, situation and contact rules
create or replace trigger registrar_auditoria
  after insert or update or delete on public.porte_concedente
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.porte_concedente
  for each row execute function app.definir_atualizado_em();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.setor_atuacao
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.setor_atuacao
  for each row execute function app.definir_atualizado_em();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.concedente
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.concedente
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_concedente
  before update on public.concedente
  for each row execute function app.validar_alteracao_concedente();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.historico_situacao_concedente
  for each row execute function app.registrar_auditoria();
create or replace trigger bloquear_alteracao
  before update on public.historico_situacao_concedente
  for each row execute function app.bloquear_alteracao();
