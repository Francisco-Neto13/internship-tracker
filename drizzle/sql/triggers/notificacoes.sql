-- Notificações: events of other tables notify by trigger (functions/15_notificacoes.sql), in
-- the transaction of the fact. Only lida_em changes in a notification.

create or replace trigger validar_alteracao_notificacao
  before update on public.notificacao
  for each row execute function app.validar_alteracao_notificacao();

create or replace trigger notificar_situacao_estagio
  after update of situacao on public.estagio
  for each row execute function app.notificar_situacao_estagio();
create or replace trigger notificar_substituicao
  after insert on public.responsavel_estagio
  for each row execute function app.notificar_substituicao();
create or replace trigger notificar_divergencia
  after insert on public.divergencia_carga_horaria
  for each row execute function app.notificar_divergencia();
create or replace trigger notificar_parecer_relatorio
  after insert on public.parecer_relatorio
  for each row execute function app.notificar_parecer_relatorio();
create or replace trigger notificar_analise_atividade
  after insert on public.analise_atividade
  for each row execute function app.notificar_analise_atividade();
