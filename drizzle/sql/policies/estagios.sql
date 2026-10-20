-- M04 Gestão de Estágios (RF015 to RF021, RF031 to RF035, RN-37; DER-LOGICO §4.4)
-- Reads: student owner, responsible people, coordination of the course and the concedente
-- (app.pode_ler_estagio). Writes follow the life cycle; triggers freeze what must not change.

-- estagio: coordination of the course formalizes; the student may start its own (UC01)
-- while the TCE is in edition. The administrator reads for the management reports (RF067).
alter table public.estagio enable row level security;

grant select, insert on public.estagio to app_runtime;
grant update (
  concedente_id, convenio_id, tipo, situacao, data_inicio, data_fim_pactuada, data_fim_prevista,
  carga_diaria_minutos, carga_semanal_minutos, carga_total_minutos, condicoes_pactuadas, bolsa_valor,
  auxilio_transporte_valor, seguro_exigido, hash_tce, tce_fechado_em, justificativa_reabertura, dispensa_duracao_maxima,
  dispensa_documento_id, documento_tce_id, ativado_em, encerrado_em
) on public.estagio to app_runtime;

-- Evaluated on the row's own columns, not through app.pode_ler_estagio(id): INSERT ... RETURNING
-- applies this policy to the new row, which a lookup by id in another snapshot cannot see yet
create policy estagio_leitura on public.estagio for select to app_runtime using (
  estudante_id = (select app.estudante_atual_id())
  or app.coordena_curso(curso_id)
  or app.representa_concedente(concedente_id)
  or app.e_responsavel_vigente(id)
  or (select app.tem_perfil_vigente('ADMINISTRADOR'))
);

create policy estagio_insercao on public.estagio for insert to app_runtime with check (
  situacao = 'EM_FORMALIZACAO'
  and hash_tce is null
  and criado_por_usuario_id = (select app.usuario_atual_id())
  and (app.coordena_curso(curso_id) or estudante_id = (select app.estudante_atual_id()))
);

create policy estagio_atualizacao_coordenacao on public.estagio for update to app_runtime
  using (app.coordena_curso(curso_id))
  with check (app.coordena_curso(curso_id));

create policy estagio_atualizacao_estudante on public.estagio for update to app_runtime
  using (estudante_id = (select app.estudante_atual_id()) and situacao = 'EM_FORMALIZACAO' and hash_tce is null)
  with check (estudante_id = (select app.estudante_atual_id()) and situacao = 'EM_FORMALIZACAO' and hash_tce is null);

-- plano_atividades (RF016, RF017): student, advisor or coordination elaborate; the advisor
-- decides (enforced by app.validar_alteracao_plano)
alter table public.plano_atividades enable row level security;

grant select, insert on public.plano_atividades to app_runtime;
grant update (atividades_previstas, justificativa_compatibilidade, situacao, parecer, decidido_por_usuario_id, decidido_em, documento_id)
  on public.plano_atividades to app_runtime;

create policy plano_leitura on public.plano_atividades for select to app_runtime using (app.pode_ler_estagio(estagio_id));

create policy plano_insercao on public.plano_atividades for insert to app_runtime with check (
  situacao = 'RASCUNHO'
  and elaborado_por_usuario_id = (select app.usuario_atual_id())
  and (app.e_estudante_do_estagio(estagio_id) or app.e_responsavel_vigente(estagio_id, 'ORIENTADOR') or app.coordena_curso_do_estagio(estagio_id))
);

create policy plano_atualizacao on public.plano_atividades for update to app_runtime
  using (app.e_estudante_do_estagio(estagio_id) or app.e_responsavel_vigente(estagio_id, 'ORIENTADOR') or app.coordena_curso_do_estagio(estagio_id))
  with check (app.e_estudante_do_estagio(estagio_id) or app.e_responsavel_vigente(estagio_id, 'ORIENTADOR') or app.coordena_curso_do_estagio(estagio_id));

-- aditivo (RF020, RF021): coordination proposes and cancels; effect applied by app.efetivar_aditivo
alter table public.aditivo enable row level security;

grant select, insert on public.aditivo to app_runtime;
grant update (situacao, efetivado_em, motivo_cancelamento, documento_id) on public.aditivo to app_runtime;

create policy aditivo_leitura on public.aditivo for select to app_runtime using (app.pode_ler_estagio(estagio_id));

create policy aditivo_insercao on public.aditivo for insert to app_runtime with check (
  situacao = 'AGUARDANDO_ASSINATURAS'
  and criado_por_usuario_id = (select app.usuario_atual_id())
  and app.coordena_curso_do_estagio(estagio_id)
);

create policy aditivo_atualizacao on public.aditivo for update to app_runtime
  using (app.coordena_curso_do_estagio(estagio_id))
  with check (app.coordena_curso_do_estagio(estagio_id));

-- assinatura (RF019): each party signs for itself; immutable
alter table public.assinatura enable row level security;

grant select, insert on public.assinatura to app_runtime;

create policy assinatura_leitura on public.assinatura for select to app_runtime using (app.pode_ler_estagio(estagio_id));

create policy assinatura_insercao on public.assinatura for insert to app_runtime with check (
  signatario_usuario_id = (select app.usuario_atual_id())
  and app.pode_assinar(estagio_id, parte)
);

-- apolice_seguro (RF018): coordination or the concedente records; immutable, replaced by a new row
alter table public.apolice_seguro enable row level security;

grant select, insert on public.apolice_seguro to app_runtime;

create policy apolice_leitura on public.apolice_seguro for select to app_runtime using (app.pode_ler_estagio(estagio_id));

create policy apolice_insercao on public.apolice_seguro for insert to app_runtime with check (
  registrado_por_usuario_id = (select app.usuario_atual_id())
  and (app.coordena_curso_do_estagio(estagio_id) or app.representa_concedente_do_estagio(estagio_id))
);

-- responsavel_estagio (RF031, RF034): coordination binds and replaces; history by period
alter table public.responsavel_estagio enable row level security;

grant select, insert on public.responsavel_estagio to app_runtime;
grant update (vigencia_fim) on public.responsavel_estagio to app_runtime;

create policy responsavel_leitura on public.responsavel_estagio for select to app_runtime using (app.pode_ler_estagio(estagio_id));

create policy responsavel_insercao on public.responsavel_estagio for insert to app_runtime with check (
  decidido_por_usuario_id = (select app.usuario_atual_id())
  and app.coordena_curso_do_estagio(estagio_id)
);

create policy responsavel_encerramento on public.responsavel_estagio for update to app_runtime
  using (app.coordena_curso_do_estagio(estagio_id))
  with check (app.coordena_curso_do_estagio(estagio_id));

-- documento of an internship (D8, RF071): readers of the internship see non-sensitive
-- metadata; sensitive ones only the student and coordination, plus the administrator's
-- metadata view for retention (RF069). Download is app.pode_baixar_documento.
create policy documento_leitura_estagio on public.documento for select to app_runtime using (
  estagio_id is not null and (
    (not sensivel and tipo <> 'RELATORIO' and app.pode_ler_estagio(estagio_id))
    or (tipo = 'RELATORIO' and app.pode_ler_relatorios(estagio_id))
    or (sensivel and (app.coordena_curso_do_estagio(estagio_id) or app.e_estudante_do_estagio(estagio_id)))
    or (select app.tem_perfil_vigente('ADMINISTRADOR'))
  )
);
