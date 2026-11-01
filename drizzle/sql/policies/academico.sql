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

-- parametro_institucional (RF006): versioned and immutable. Any authenticated user reads
-- it (jornada and duration rules need it); the administrator inserts a new version, never
-- retroactive (DER-LOGICO §5.5: the policy compares with current_date, a check cannot)
alter table public.parametro_institucional enable row level security;

grant select, insert on public.parametro_institucional to app_runtime;

create policy parametro_leitura on public.parametro_institucional for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy parametro_insercao on public.parametro_institucional for insert to app_runtime with check (
  (select app.tem_perfil_vigente('ADMINISTRADOR'))
  and definido_por_usuario_id = (select app.usuario_atual_id())
  and vigencia_inicio >= current_date
);

-- categoria_atividade (RF004, RF048): catalog read by everyone, kept by the administrator.
-- Deactivated through ativa, never deleted.
alter table public.categoria_atividade enable row level security;

grant select, insert on public.categoria_atividade to app_runtime;
grant update (nome, descricao, ativa) on public.categoria_atividade to app_runtime;

create policy categoria_leitura on public.categoria_atividade for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy categoria_insercao on public.categoria_atividade for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy categoria_atualizacao on public.categoria_atividade for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

-- exigencia_categoria (RF004, RN-34): hour limit per category in each course
alter table public.exigencia_categoria enable row level security;

grant select, insert on public.exigencia_categoria to app_runtime;
grant update (limite_minutos, admite_estagio_nao_obrigatorio) on public.exigencia_categoria to app_runtime;

create policy exigencia_leitura on public.exigencia_categoria for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy exigencia_insercao on public.exigencia_categoria for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy exigencia_atualizacao on public.exigencia_categoria for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));
