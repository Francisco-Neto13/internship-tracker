-- RF003: only an administrator in force opens a switch, for themselves; only who opened it
-- closes it. Administrators read the history; nobody deletes it (RN-28).
alter table public.contexto_administrador enable row level security;

grant select on public.contexto_administrador to app_runtime;
grant insert on public.contexto_administrador to app_runtime;
grant update (encerrado_em) on public.contexto_administrador to app_runtime;

create policy contexto_administrador_leitura on public.contexto_administrador for select to app_runtime
  using (administrador_id = (select app.usuario_atual_id()) or (select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy contexto_administrador_inclusao on public.contexto_administrador for insert to app_runtime
  with check (administrador_id = (select app.usuario_atual_id()) and (select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy contexto_administrador_encerramento on public.contexto_administrador for update to app_runtime
  using (administrador_id = (select app.usuario_atual_id()))
  with check (administrador_id = (select app.usuario_atual_id()));
