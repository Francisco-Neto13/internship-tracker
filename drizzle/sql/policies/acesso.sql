-- M01 Acesso e Usuarios (RF001, RF002, RF003, RN-37)

-- Auth infrastructure: only auth_runtime reaches it. app_runtime has no grant at all,
-- so domain code touching sessions or password hashes fails with permission denied.
alter table public.sessao enable row level security;
alter table public.conta enable row level security;
alter table public.verificacao enable row level security;
alter table public.limite_requisicao enable row level security;

grant select, insert, update, delete on public.sessao, public.conta, public.verificacao, public.limite_requisicao to auth_runtime;

create policy sessao_auth on public.sessao for all to auth_runtime using (true) with check (true);
create policy conta_auth on public.conta for all to auth_runtime using (true) with check (true);
create policy verificacao_auth on public.verificacao for all to auth_runtime using (true) with check (true);
create policy limite_requisicao_auth on public.limite_requisicao for all to auth_runtime using (true) with check (true);

-- usuario: auth_runtime signs users in; domain code only reads what the profile allows
alter table public.usuario enable row level security;

grant select, insert, update on public.usuario to auth_runtime;
grant select on public.usuario to app_runtime;

create policy usuario_auth on public.usuario for all to auth_runtime using (true) with check (true);

create policy usuario_leitura on public.usuario for select to app_runtime using (
  id = (select app.usuario_atual_id())
  or (select app.tem_perfil_vigente('ADMINISTRADOR'))
  or app.coordena_estudante_usuario(id)
);

-- vinculo_perfil: history is preserved, so updates may only close vigencia_fim
alter table public.vinculo_perfil enable row level security;

grant select, insert on public.vinculo_perfil to app_runtime;
grant update (vigencia_fim) on public.vinculo_perfil to app_runtime;

create policy vinculo_perfil_leitura on public.vinculo_perfil for select to app_runtime using (
  usuario_id = (select app.usuario_atual_id())
  or (select app.tem_perfil_vigente('ADMINISTRADOR'))
);

create policy vinculo_perfil_insercao on public.vinculo_perfil for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy vinculo_perfil_encerramento on public.vinculo_perfil for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));
