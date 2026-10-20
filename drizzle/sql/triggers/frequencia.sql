-- M05: audit, timestamps and the rules of functions/08_frequencia.sql. Constraint triggers
-- have no OR REPLACE, so they are dropped and created again on every migration.
create or replace trigger registrar_auditoria
  after insert or update or delete on public.registro_frequencia
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.registro_frequencia
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_registro_frequencia
  before insert on public.registro_frequencia
  for each row execute function app.validar_registro_frequencia();
create or replace trigger validar_alteracao_frequencia
  before update on public.registro_frequencia
  for each row execute function app.validar_alteracao_frequencia();
drop trigger if exists exigir_substituto_frequencia on public.registro_frequencia;
create constraint trigger exigir_substituto_frequencia
  after update on public.registro_frequencia
  deferrable initially deferred
  for each row execute function app.exigir_substituto_frequencia();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.homologacao_frequencia
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_homologacao
  before insert on public.homologacao_frequencia
  for each row execute function app.validar_homologacao();
create or replace trigger bloquear_alteracao
  before update on public.homologacao_frequencia
  for each row execute function app.bloquear_alteracao();
drop trigger if exists conferir_homologacao on public.homologacao_frequencia;
create constraint trigger conferir_homologacao
  after insert on public.homologacao_frequencia
  deferrable initially deferred
  for each row execute function app.conferir_homologacao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.divergencia_carga_horaria
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.divergencia_carga_horaria
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_divergencia
  before update on public.divergencia_carga_horaria
  for each row execute function app.validar_alteracao_divergencia();
