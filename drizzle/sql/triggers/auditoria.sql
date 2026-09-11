-- RN-28: append-only trail, enforced for every role including the owner
create or replace trigger auditoria_somente_inclusao
  before update or delete on public.auditoria
  for each row execute function app.bloquear_alteracao_auditoria();

create or replace trigger auditoria_sem_truncate
  before truncate on public.auditoria
  for each statement execute function app.bloquear_alteracao_auditoria();

-- RF065: tables whose changes enter the trail. Auth infrastructure is left out on
-- purpose (session tokens, password hashes).
create or replace trigger registrar_auditoria
  after insert or update or delete on public.usuario
  for each row execute function app.registrar_auditoria();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.vinculo_perfil
  for each row execute function app.registrar_auditoria();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.curso
  for each row execute function app.registrar_auditoria();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.estudante
  for each row execute function app.registrar_auditoria();

create or replace trigger definir_atualizado_em
  before update on public.usuario
  for each row execute function app.definir_atualizado_em();

create or replace trigger definir_atualizado_em
  before update on public.curso
  for each row execute function app.definir_atualizado_em();

create or replace trigger definir_atualizado_em
  before update on public.estudante
  for each row execute function app.definir_atualizado_em();
