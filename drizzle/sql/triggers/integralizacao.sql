-- M07 Integralização: assessments are immutable, and every event that changes the result
-- stores a new one in its own transaction (functions/14_integralizacao.sql). Not audited
-- (DER §4.7): derived data, reproducible from audited tables.
create or replace trigger bloquear_alteracao
  before update on public.apuracao_integralizacao
  for each row execute function app.bloquear_alteracao();
create or replace trigger bloquear_alteracao
  before update on public.apuracao_categoria
  for each row execute function app.bloquear_alteracao();

create or replace trigger reapurar_por_atividade
  after update of situacao on public.atividade_complementar
  for each row execute function app.reapurar_por_atividade();

create or replace trigger reapurar_por_estagio
  after update of situacao on public.estagio
  for each row execute function app.reapurar_por_estagio();

-- Statement-level with transition tables, one for each event (a trigger with transition
-- tables takes a single event)
create or replace trigger reapurar_por_exigencia_insercao
  after insert on public.exigencia_categoria
  referencing new table as mudadas
  for each statement execute function app.reapurar_por_exigencia();
create or replace trigger reapurar_por_exigencia_alteracao
  after update on public.exigencia_categoria
  referencing new table as mudadas
  for each statement execute function app.reapurar_por_exigencia();

create or replace trigger reapurar_por_curso
  after update on public.curso
  for each row execute function app.reapurar_por_curso();
