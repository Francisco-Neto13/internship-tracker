-- M05 Avaliação e acompanhamento: audit, timestamps and the rules of functions/10
create or replace trigger registrar_auditoria
  after insert or update or delete on public.criterio_avaliacao
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.criterio_avaliacao
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_alteracao_criterio
  before update on public.criterio_avaliacao
  for each row execute function app.validar_alteracao_criterio();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.avaliacao_desempenho
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_avaliacao
  before insert on public.avaliacao_desempenho
  for each row execute function app.validar_avaliacao();
create or replace trigger bloquear_alteracao
  before update on public.avaliacao_desempenho
  for each row execute function app.bloquear_alteracao();
drop trigger if exists exigir_respostas_avaliacao on public.avaliacao_desempenho;
create constraint trigger exigir_respostas_avaliacao
  after insert on public.avaliacao_desempenho
  deferrable initially deferred
  for each row execute function app.exigir_respostas_avaliacao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.resposta_avaliacao
  for each row execute function app.registrar_auditoria();
create or replace trigger validar_resposta_avaliacao
  before insert on public.resposta_avaliacao
  for each row execute function app.validar_resposta_avaliacao();
create or replace trigger bloquear_alteracao
  before update on public.resposta_avaliacao
  for each row execute function app.bloquear_alteracao();

create or replace trigger registrar_auditoria
  after insert or update or delete on public.acompanhamento
  for each row execute function app.registrar_auditoria();
create or replace trigger definir_atualizado_em
  before update on public.acompanhamento
  for each row execute function app.definir_atualizado_em();
create or replace trigger validar_acompanhamento
  before insert or update on public.acompanhamento
  for each row execute function app.validar_acompanhamento();
