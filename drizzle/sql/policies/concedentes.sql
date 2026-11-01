-- M03 Concedentes (RF007, RF008, RF013, RN-01, RN-31, RN-37)

-- porte_concedente, setor_atuacao (RF013): values kept by the administrator, read by all
alter table public.porte_concedente enable row level security;
alter table public.setor_atuacao enable row level security;

grant select, insert on public.porte_concedente, public.setor_atuacao to app_runtime;
grant update (nome, ativo) on public.porte_concedente, public.setor_atuacao to app_runtime;

create policy porte_leitura on public.porte_concedente for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);
create policy porte_insercao on public.porte_concedente for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));
create policy porte_atualizacao on public.porte_concedente for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy setor_leitura on public.setor_atuacao for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);
create policy setor_insercao on public.setor_atuacao for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));
create policy setor_atualizacao on public.setor_atuacao for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

-- concedente: catalog read by every authenticated user (formalizing an internship needs it).
-- Administrator and coordination maintain it; a representative edits its own contacts
-- (columns enforced by app.validar_alteracao_concedente). New rows start ATIVA: suspension
-- happens through the history (RF008).
alter table public.concedente enable row level security;

grant select, insert on public.concedente to app_runtime;
grant update (
  razao_social, nome_fantasia, cnpj, logradouro, numero_endereco, complemento, bairro, municipio, uf, cep,
  email_contato, telefone_contato, representante_legal_nome, representante_legal_cargo, area_atuacao,
  porte_id, setor_atuacao_id, situacao
) on public.concedente to app_runtime;

create policy concedente_leitura on public.concedente for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy concedente_insercao on public.concedente for insert to app_runtime with check (
  ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')))
  and situacao = 'ATIVA'
);

create policy concedente_atualizacao on public.concedente for update to app_runtime
  using (
    (select app.tem_perfil_vigente('ADMINISTRADOR'))
    or (select app.tem_perfil_vigente('COORDENACAO'))
    or app.representa_concedente(id)
  )
  with check (
    (select app.tem_perfil_vigente('ADMINISTRADOR'))
    or (select app.tem_perfil_vigente('COORDENACAO'))
    or app.representa_concedente(id)
  );

-- historico_situacao_concedente (RF008): immutable, written by administrator or coordination
alter table public.historico_situacao_concedente enable row level security;

grant select, insert on public.historico_situacao_concedente to app_runtime;

create policy historico_concedente_leitura on public.historico_situacao_concedente for select to app_runtime using (
  (select app.tem_perfil_vigente('ADMINISTRADOR'))
  or (select app.tem_perfil_vigente('COORDENACAO'))
  or app.representa_concedente(concedente_id)
);

create policy historico_concedente_insercao on public.historico_situacao_concedente for insert to app_runtime with check (
  ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')))
  and decidido_por_usuario_id = (select app.usuario_atual_id())
);
