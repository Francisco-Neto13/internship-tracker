-- M02 Gestao Academica (RF004, RF005, RN-34, RN-37)

-- curso: the catalog is visible to any authenticated user; the administrator maintains it
alter table public.curso enable row level security;

grant select, insert, update on public.curso to app_runtime;

create policy curso_leitura on public.curso for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy curso_insercao on public.curso for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy curso_atualizacao on public.curso for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

-- estudante: the student sees itself; coordination sees its courses; admin sees all.
-- Advisors and supervisors gain access through estagio in Fase 2.
alter table public.estudante enable row level security;

grant select, insert, update on public.estudante to app_runtime;

create policy estudante_leitura on public.estudante for select to app_runtime using (
  usuario_id = (select app.usuario_atual_id())
  or (select app.tem_perfil_vigente('ADMINISTRADOR'))
  or app.coordena_curso(curso_id)
);

create policy estudante_insercao on public.estudante for insert to app_runtime with check (
  (select app.tem_perfil_vigente('ADMINISTRADOR'))
  or app.coordena_curso(curso_id)
);

-- USING checks the row before the change, WITH CHECK the row after it, so coordination
-- cannot move a student into a course it does not coordinate
create policy estudante_atualizacao on public.estudante for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')) or app.coordena_curso(curso_id))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')) or app.coordena_curso(curso_id));
