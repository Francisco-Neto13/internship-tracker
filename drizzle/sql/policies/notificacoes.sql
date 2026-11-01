-- Notificações (RF070; DER-LOGICO §4.9): only the recipient reads and marks as read. Nobody
-- inserts through a grant: app.notificar writes, from events and from the daily routine.
alter table public.notificacao enable row level security;

grant select on public.notificacao to app_runtime;
grant update (lida_em) on public.notificacao to app_runtime;

create policy notificacao_leitura on public.notificacao for select to app_runtime
  using (destinatario_usuario_id = (select app.usuario_atual_id()));

create policy notificacao_marcar_lida on public.notificacao for update to app_runtime
  using (destinatario_usuario_id = (select app.usuario_atual_id()))
  with check (destinatario_usuario_id = (select app.usuario_atual_id()));
