-- M05 Frequência e carga horária (RF023 to RF030, RN-37; DER-LOGICO §4.5)
-- Reads follow the internship (app.pode_ler_estagio); the administrator has no access.
-- Who may record, homologate or correct is enforced again by the triggers of
-- functions/08_frequencia.sql, which also decide situacao and the limits applied.

-- registro_frequencia: the student records; the supervisor homologates; the student or the
-- coordination corrects (a new row) or cancels; only the coordination replaces homologated ones
alter table public.registro_frequencia enable row level security;

grant select, insert on public.registro_frequencia to app_runtime;
grant update (situacao, homologacao_id, justificativa_cancelamento) on public.registro_frequencia to app_runtime;

create policy frequencia_leitura on public.registro_frequencia for select to app_runtime
  using (app.pode_ler_estagio(estagio_id));

create policy frequencia_insercao on public.registro_frequencia for insert to app_runtime with check (
  registrado_por_usuario_id = (select app.usuario_atual_id())
  and (
    app.e_estudante_do_estagio(estagio_id)
    or (substitui_registro_id is not null and app.coordena_curso_do_estagio(estagio_id))
  )
);

create policy frequencia_atualizacao on public.registro_frequencia for update to app_runtime
  using (
    app.e_estudante_do_estagio(estagio_id)
    or app.e_responsavel_vigente(estagio_id, 'SUPERVISOR')
    or app.coordena_curso_do_estagio(estagio_id)
  )
  with check (
    app.e_estudante_do_estagio(estagio_id)
    or app.e_responsavel_vigente(estagio_id, 'SUPERVISOR')
    or app.coordena_curso_do_estagio(estagio_id)
  );

-- homologacao_frequencia: the supervisor in force; immutable
alter table public.homologacao_frequencia enable row level security;

grant select, insert on public.homologacao_frequencia to app_runtime;

create policy homologacao_leitura on public.homologacao_frequencia for select to app_runtime
  using (app.pode_ler_estagio(estagio_id));

create policy homologacao_insercao on public.homologacao_frequencia for insert to app_runtime with check (
  homologado_por_usuario_id = (select app.usuario_atual_id())
  and app.e_responsavel_vigente(estagio_id, 'SUPERVISOR')
);

-- divergencia_carga_horaria (RF028, RN-09): for the advisor's analysis; the student and the
-- coordination follow it. Opened by whoever's write revealed it (the system acting on the
-- write), closed only by the advisor.
alter table public.divergencia_carga_horaria enable row level security;

grant select, insert on public.divergencia_carga_horaria to app_runtime;
grant update (situacao, parecer, analisada_por_usuario_id, analisada_em) on public.divergencia_carga_horaria to app_runtime;

create policy divergencia_leitura on public.divergencia_carga_horaria for select to app_runtime using (
  app.e_estudante_do_estagio(estagio_id)
  or app.e_responsavel_vigente(estagio_id, 'ORIENTADOR')
  or app.coordena_curso_do_estagio(estagio_id)
);

create policy divergencia_insercao on public.divergencia_carga_horaria for insert to app_runtime with check (
  situacao = 'ABERTA'
  and analisada_em is null
  and app.pode_ler_estagio(estagio_id)
);

create policy divergencia_analise on public.divergencia_carga_horaria for update to app_runtime
  using (app.e_responsavel_vigente(estagio_id, 'ORIENTADOR'))
  with check (app.e_responsavel_vigente(estagio_id, 'ORIENTADOR'));
