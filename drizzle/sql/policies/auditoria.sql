-- M08 Auditoria (RF065, RF066, RN-28). Read by the administrator (UC23); nobody writes
-- through a grant, only through the app.registrar_auditoria() trigger.
alter table public.auditoria enable row level security;

grant select on public.auditoria to app_runtime;

create policy auditoria_leitura on public.auditoria for select to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')));
