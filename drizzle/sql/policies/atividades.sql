-- M06 Atividades complementares (RF049 to RF055, RN-37; DER-LOGICO §4.6). The student and the
-- coordination of the student's course read; the administrator has no access. The student
-- registers and complements; the coordination decides through analise_atividade.

-- atividade_complementar
alter table public.atividade_complementar enable row level security;

grant select, insert on public.atividade_complementar to app_runtime;
grant update (categoria_id, descricao, instituicao_promotora, data_inicio, data_fim, horas_declaradas_minutos, origem_estagio_id, situacao)
  on public.atividade_complementar to app_runtime;

-- Set evaluated once per query: app.estudantes_legiveis (scripts/db/desempenho.ts)
create policy atividade_leitura on public.atividade_complementar for select to app_runtime
  using (estudante_id in (select app.estudantes_legiveis()));

create policy atividade_insercao on public.atividade_complementar for insert to app_runtime with check (
  registrada_por_usuario_id = (select app.usuario_atual_id())
  and estudante_id = (select app.estudante_atual_id())
);

create policy atividade_atualizacao on public.atividade_complementar for update to app_runtime
  using (estudante_id = (select app.estudante_atual_id()))
  with check (estudante_id = (select app.estudante_atual_id()));

-- comprovante_atividade: the student adds and withdraws
alter table public.comprovante_atividade enable row level security;

grant select, insert on public.comprovante_atividade to app_runtime;
grant update (valido) on public.comprovante_atividade to app_runtime;

create policy comprovante_leitura on public.comprovante_atividade for select to app_runtime
  using (estudante_id in (select app.estudantes_legiveis()));

create policy comprovante_insercao on public.comprovante_atividade for insert to app_runtime
  with check (estudante_id = (select app.estudante_atual_id()));

create policy comprovante_retirada on public.comprovante_atividade for update to app_runtime
  using (estudante_id = (select app.estudante_atual_id()))
  with check (estudante_id = (select app.estudante_atual_id()));

-- analise_atividade: the coordination of the student's course; immutable
alter table public.analise_atividade enable row level security;

grant select, insert on public.analise_atividade to app_runtime;

create policy analise_atividade_leitura on public.analise_atividade for select to app_runtime
  using (app.estudante_da_atividade(atividade_id) in (select app.estudantes_legiveis()));

create policy analise_atividade_insercao on public.analise_atividade for insert to app_runtime with check (
  analisado_por_usuario_id = (select app.usuario_atual_id())
  and app.coordena_curso_do_estudante(app.estudante_da_atividade(atividade_id))
);

-- documento of a student (COMPROVANTE_ATIVIDADE, D8): the student and the coordination of its
-- course; the administrator sees the metadata for retention (RF069)
create policy documento_leitura_estudante on public.documento for select to app_runtime using (
  estudante_id is not null and (
    estudante_id in (select app.estudantes_legiveis())
    or (select app.tem_perfil_vigente('ADMINISTRADOR'))
  )
);
