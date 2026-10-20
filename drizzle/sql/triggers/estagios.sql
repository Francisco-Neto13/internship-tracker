-- M04: audit, timestamps and the life-cycle rules of functions/07_estagios.sql
create or replace trigger registrar_auditoria
  after insert or update or delete on public.estagio
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.estagio
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_estagio
  before update on public.estagio
  for each row execute function app.validar_alteracao_estagio();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.plano_atividades
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.plano_atividades
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_plano
  before update on public.plano_atividades
  for each row execute function app.validar_alteracao_plano();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.aditivo
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.aditivo
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_aditivo
  before update on public.aditivo
  for each row execute function app.validar_alteracao_aditivo();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.assinatura
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_assinatura
  before insert on public.assinatura
  for each row execute function app.validar_assinatura();
create or replace trigger bloquear_alteracao
  before update on public.assinatura
  for each row execute function app.bloquear_alteracao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.apolice_seguro
  for each row execute function app.registrar_auditoria();
create or replace trigger bloquear_alteracao
  before update on public.apolice_seguro
  for each row execute function app.bloquear_alteracao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.responsavel_estagio
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.responsavel_estagio
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_responsavel
  before insert or update on public.responsavel_estagio
  for each row execute function app.validar_responsavel();
