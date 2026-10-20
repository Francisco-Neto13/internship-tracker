-- M04 Gestão de Estágios (RF015 to RF021, RF031 to RF035, RF044, RF062; DER-LOGICO §1.5, §5)
-- Helpers read link tables as the owner (SECURITY DEFINER), so policies can call them
-- without recursing into their own RLS. They answer yes/no or aggregates, never rows.

create or replace function app.estudante_atual_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.estudante e where e.usuario_id = app.usuario_atual_id()
$$;

create or replace function app.e_estudante_do_estagio(p_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.estagio g
    join public.estudante e on e.id = g.estudante_id
    join public.usuario u on u.id = e.usuario_id
    where g.id = p_estagio_id and e.usuario_id = app.usuario_atual_id() and u.situacao = 'ATIVO'
  )
$$;

-- Responsible person designated and not ended (vigencia_fim null or in the future). A start
-- date in the future still counts: the advisor approves the plan during formalization,
-- before the internship begins (RF017).
create or replace function app.e_responsavel_vigente(p_estagio_id uuid, p_papel public.papel_responsavel default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.responsavel_estagio r
    join public.usuario u on u.id = r.usuario_id
    where r.estagio_id = p_estagio_id
      and r.usuario_id = app.usuario_atual_id()
      and (p_papel is null or r.papel = p_papel)
      and (r.vigencia_fim is null or (r.vigencia_fim > current_date and r.vigencia_fim > r.vigencia_inicio))
      and u.situacao = 'ATIVO'
  )
$$;

create or replace function app.coordena_curso_do_estagio(p_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.estagio g where g.id = p_estagio_id and app.coordena_curso(g.curso_id))
$$;

create or replace function app.representa_concedente_do_estagio(p_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.estagio g where g.id = p_estagio_id and app.representa_concedente(g.concedente_id))
$$;

-- RN-37: student owner, responsible person, coordination of the course or the concedente
create or replace function app.pode_ler_estagio(p_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.e_estudante_do_estagio(p_estagio_id)
      or app.e_responsavel_vigente(p_estagio_id)
      or app.coordena_curso_do_estagio(p_estagio_id)
      or app.representa_concedente_do_estagio(p_estagio_id)
$$;

-- RF019: who may sign for each party
create or replace function app.pode_assinar(p_estagio_id uuid, p_parte public.parte_assinatura)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_parte
    when 'ESTUDANTE' then app.e_estudante_do_estagio(p_estagio_id) and app.tem_perfil_vigente('ESTUDANTE')
    when 'INSTITUICAO' then app.coordena_curso_do_estagio(p_estagio_id)
    when 'CONCEDENTE' then app.representa_concedente_do_estagio(p_estagio_id)
  end
$$;

-- RF062 (DER §5.4): days used by the other activated internships of the student at the same
-- concedente, ended ones until encerrado_em, ongoing ones until data_fim_prevista. Internships
-- with the art. 11 exemption (D5) do not count. Aggregate only, readable by any caller.
create or replace function app.dias_usados_no_par(p_estudante_id uuid, p_concedente_id uuid, p_exceto_estagio_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(coalesce(g.encerrado_em::date, g.data_fim_prevista) - g.data_inicio + 1), 0)::integer
  from public.estagio g
  where g.estudante_id = p_estudante_id
    and g.concedente_id = p_concedente_id
    and g.id is distinct from p_exceto_estagio_id
    and g.ativado_em is not null
    and not g.dispensa_duracao_maxima
$$;

-- Closed decision: one ATIVO internship per student; the unique index is the barrier, this
-- lets the activation report it together with the other guards
create or replace function app.tem_outro_estagio_ativo(p_estudante_id uuid, p_exceto_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.estagio g
    where g.estudante_id = p_estudante_id and g.situacao = 'ATIVO' and g.id <> p_exceto_estagio_id
  )
$$;

-- RF014, RF008: aggregate history of a concedente, with no personal data
create or replace function app.historico_estagios_concedente(p_concedente_id uuid)
returns table (situacao public.situacao_estagio, quantidade bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select g.situacao, count(*)
  from public.estagio g
  where g.concedente_id = p_concedente_id
    and (app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO') or app.representa_concedente(p_concedente_id))
  group by g.situacao
$$;

-- estagio (DER §4.4, D9): what may change in each moment of the life cycle
create or replace function app.validar_alteracao_estagio()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_campos_tce text[] := array['concedente_id', 'convenio_id', 'tipo', 'data_inicio', 'condicoes_pactuadas',
    'bolsa_valor', 'auxilio_transporte_valor', 'seguro_exigido', 'dispensa_duracao_maxima', 'dispensa_documento_id'];
  v_campos_aditivo text[] := array['data_fim_pactuada', 'data_fim_prevista', 'carga_diaria_minutos',
    'carga_semanal_minutos', 'carga_total_minutos'];
  v_campo text;
  v_aditivo_efetivado boolean;
begin
  if new.estudante_id <> old.estudante_id or new.curso_id <> old.curso_id or new.criado_por_usuario_id <> old.criado_por_usuario_id then
    raise exception 'ALTERACAO_ESTAGIO_VEDADA: estudante, curso e autor do estágio não mudam' using errcode = 'P0001';
  end if;

  -- Life cycle (requisitos §8.6): EM_FORMALIZACAO -> ATIVO -> CONCLUIDO | RESCINDIDO
  if new.situacao <> old.situacao and not (
    (old.situacao = 'EM_FORMALIZACAO' and new.situacao = 'ATIVO')
    or (old.situacao = 'ATIVO' and new.situacao in ('CONCLUIDO', 'RESCINDIDO'))
  ) then
    raise exception 'TRANSICAO_ESTAGIO_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
  end if;

  -- TCE in edition: everything editable except the identity columns above
  if old.situacao = 'EM_FORMALIZACAO' and old.hash_tce is null then
    return new;
  end if;

  -- Reopening (D9): only the hash is cleared, back to edition, while still in formalization
  if old.situacao = 'EM_FORMALIZACAO' and new.situacao = 'EM_FORMALIZACAO' and new.hash_tce is null then
    if (to_jsonb(new) - array['hash_tce', 'tce_fechado_em', 'justificativa_reabertura', 'atualizado_em']) is distinct from (to_jsonb(old) - array['hash_tce', 'tce_fechado_em', 'justificativa_reabertura', 'atualizado_em']) then
      raise exception 'ALTERACAO_ESTAGIO_VEDADA: a reabertura do TCE não altera seus campos' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.hash_tce is distinct from old.hash_tce then
    raise exception 'ALTERACAO_ESTAGIO_VEDADA: o hash do TCE fechado não muda; reabra o TCE' using errcode = 'P0001';
  end if;

  foreach v_campo in array v_campos_tce loop
    if (to_jsonb(new) -> v_campo) is distinct from (to_jsonb(old) -> v_campo) then
      raise exception 'ALTERACAO_ESTAGIO_VEDADA: % só muda com o TCE em edição', v_campo using errcode = 'P0001';
    end if;
  end loop;

  -- RN-06, RF020: dates and workloads change only with an amendment made effective in this
  -- same transaction (now() is the transaction start)
  select exists (
    select 1 from public.aditivo a
    where a.estagio_id = new.id and a.situacao = 'VIGENTE' and a.efetivado_em = now()
  ) into v_aditivo_efetivado;
  foreach v_campo in array v_campos_aditivo loop
    if (to_jsonb(new) -> v_campo) is distinct from (to_jsonb(old) -> v_campo) and not v_aditivo_efetivado then
      raise exception 'ALTERACAO_ESTAGIO_VEDADA: % só muda por aditivo efetivado', v_campo using errcode = 'P0001';
    end if;
  end loop;

  return new;
end
$$;

-- RF016, RF017: plan content is frozen once submitted; only the advisor decides
create or replace function app.validar_alteracao_plano()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.situacao <> 'RASCUNHO' and (
    new.atividades_previstas is distinct from old.atividades_previstas
    or new.justificativa_compatibilidade is distinct from old.justificativa_compatibilidade
  ) then
    raise exception 'PLANO_IMUTAVEL: o conteúdo do plano só muda em rascunho' using errcode = 'P0001';
  end if;
  if new.situacao <> old.situacao and not (
    (old.situacao = 'RASCUNHO' and new.situacao = 'AGUARDANDO_APROVACAO')
    or (old.situacao = 'AGUARDANDO_APROVACAO' and new.situacao in ('APROVADO', 'DEVOLVIDO'))
    or (old.situacao = 'APROVADO' and new.situacao = 'SUBSTITUIDO')
  ) then
    raise exception 'TRANSICAO_PLANO_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
  end if;
  if new.situacao in ('APROVADO', 'DEVOLVIDO') and old.situacao = 'AGUARDANDO_APROVACAO'
     and app.usuario_atual_id() is not null
     and not app.e_responsavel_vigente(new.estagio_id, 'ORIENTADOR') then
    raise exception 'DECISAO_PLANO_RESTRITA: só o professor orientador do estágio decide o plano' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF031, RF034 (DER §5.6): the person holds the compatible profile; a supervisor belongs to
-- the concedente of the internship
create or replace function app.validar_responsavel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_concedente_id uuid;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['vigencia_fim', 'atualizado_em']) is distinct from (to_jsonb(old) - array['vigencia_fim', 'atualizado_em']) then
      raise exception 'REGISTRO_IMUTAVEL: só o fim da vigência do responsável muda' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select g.concedente_id into v_concedente_id from public.estagio g where g.id = new.estagio_id;
  if not exists (
    select 1 from public.vinculo_perfil v
    join public.usuario u on u.id = v.usuario_id
    where v.usuario_id = new.usuario_id
      and u.situacao = 'ATIVO'
      and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
      and (
        (new.papel = 'ORIENTADOR' and v.perfil = 'PROFESSOR_ORIENTADOR')
        or (new.papel = 'SUPERVISOR' and v.perfil = 'SUPERVISOR' and v.concedente_id = v_concedente_id)
      )
  ) then
    raise exception 'PERFIL_INCOMPATIVEL: o usuário não tem perfil vigente de % compatível com o estágio', new.papel
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF019, RN-28 (DER §4.4): a signature is over the hash in force, by the signer in person
create or replace function app.validar_assinatura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio record;
  v_aditivo record;
begin
  if new.signatario_usuario_id is distinct from app.usuario_atual_id() and app.usuario_atual_id() is not null then
    raise exception 'ASSINATURA_DE_TERCEIRO: cada parte assina por si' using errcode = 'P0001';
  end if;
  select g.situacao, g.hash_tce into v_estagio from public.estagio g where g.id = new.estagio_id;
  if new.aditivo_id is null then
    if v_estagio.situacao <> 'EM_FORMALIZACAO' or v_estagio.hash_tce is null then
      raise exception 'TCE_NAO_FECHADO: o TCE só é assinado fechado e em formalização' using errcode = 'P0001';
    end if;
    if new.hash_documento <> v_estagio.hash_tce then
      raise exception 'HASH_DIVERGENTE: a assinatura não corresponde ao TCE vigente' using errcode = 'P0001';
    end if;
  else
    select a.estagio_id, a.situacao, a.hash_conteudo into v_aditivo from public.aditivo a where a.id = new.aditivo_id;
    if v_aditivo.estagio_id <> new.estagio_id or v_aditivo.situacao <> 'AGUARDANDO_ASSINATURAS' then
      raise exception 'ADITIVO_NAO_ASSINAVEL: aditivo de outro estágio ou fora de assinatura' using errcode = 'P0001';
    end if;
    if new.hash_documento <> v_aditivo.hash_conteudo then
      raise exception 'HASH_DIVERGENTE: a assinatura não corresponde ao aditivo' using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;

-- RF020, RF021 (DER §5.7): amendment content is frozen; only its situation moves on
create or replace function app.validar_alteracao_aditivo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['situacao', 'efetivado_em', 'motivo_cancelamento', 'documento_id', 'atualizado_em'])
     is distinct from (to_jsonb(old) - array['situacao', 'efetivado_em', 'motivo_cancelamento', 'documento_id', 'atualizado_em']) then
    raise exception 'REGISTRO_IMUTAVEL: o conteúdo do aditivo não muda' using errcode = 'P0001';
  end if;
  if new.situacao <> old.situacao and old.situacao <> 'AGUARDANDO_ASSINATURAS' then
    raise exception 'TRANSICAO_ADITIVO_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF020 (DER §5.7): with the three signatures the amendment becomes VIGENTE and its effect is
-- applied to the internship in the same transaction. SECURITY DEFINER because the third
-- signer (student or concedente) cannot update the internship; the audit trail still records
-- that signer as author, since app.usuario_atual_id() is the session identity.
create or replace function app.efetivar_aditivo(p_aditivo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aditivo public.aditivo%rowtype;
  v_estagio public.estagio%rowtype;
  v_supervisor public.responsavel_estagio%rowtype;
  v_inicio_novo date;
begin
  select * into v_aditivo from public.aditivo where id = p_aditivo_id for update;
  if v_aditivo.situacao <> 'AGUARDANDO_ASSINATURAS'
     or (select count(distinct s.parte) from public.assinatura s where s.aditivo_id = p_aditivo_id) < 3 then
    return false;
  end if;
  select * into v_estagio from public.estagio where id = v_aditivo.estagio_id for update;

  update public.aditivo set situacao = 'VIGENTE', efetivado_em = now() where id = p_aditivo_id;

  if v_aditivo.tipo = 'PRORROGACAO' then
    update public.estagio
       set data_fim_pactuada = v_aditivo.nova_data_fim_pactuada,
           data_fim_prevista = v_estagio.data_fim_prevista + (v_aditivo.nova_data_fim_pactuada - v_estagio.data_fim_pactuada)
     where id = v_estagio.id;
  elsif v_aditivo.tipo = 'ALTERACAO_CARGA_HORARIA' then
    update public.estagio
       set carga_diaria_minutos = coalesce(v_aditivo.nova_carga_diaria_minutos, carga_diaria_minutos),
           carga_semanal_minutos = coalesce(v_aditivo.nova_carga_semanal_minutos, carga_semanal_minutos),
           carga_total_minutos = coalesce(v_aditivo.nova_carga_total_minutos, carga_total_minutos)
     where id = v_estagio.id;
  else
    select * into v_supervisor from public.responsavel_estagio
     where estagio_id = v_estagio.id and papel = 'SUPERVISOR' and (vigencia_fim is null or (vigencia_fim > current_date and vigencia_fim > vigencia_inicio))
     order by vigencia_inicio desc limit 1 for update;
    v_inicio_novo := greatest(current_date, coalesce(v_supervisor.vigencia_inicio + 1, current_date));
    if v_supervisor.id is not null then
      update public.responsavel_estagio set vigencia_fim = v_inicio_novo where id = v_supervisor.id;
    end if;
    insert into public.responsavel_estagio (
      estagio_id, papel, usuario_id, vigencia_inicio, substitui_responsavel_id, motivo_substituicao,
      decidido_por_usuario_id, aditivo_id
    ) values (
      v_estagio.id, 'SUPERVISOR', v_aditivo.novo_supervisor_usuario_id, v_inicio_novo, v_supervisor.id,
      v_aditivo.justificativa, v_aditivo.criado_por_usuario_id, v_aditivo.id
    );
  end if;
  return true;
end
$$;

-- D8, extended for estágio-scoped documents. Replaces the version of functions/06.
create or replace function app.pode_enviar_documento(
  p_tipo public.tipo_documento,
  p_concedente_id uuid,
  p_estagio_id uuid,
  p_estudante_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_tipo = 'CONVENIO' then
      p_concedente_id is not null and p_estagio_id is null and p_estudante_id is null
      and (app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO'))
    when p_estagio_id is null or p_concedente_id is not null or p_estudante_id is not null then false
    when p_tipo in ('TCE', 'ADITIVO', 'ASSINATURA', 'DISPENSA_DURACAO') then app.coordena_curso_do_estagio(p_estagio_id)
    when p_tipo = 'APOLICE' then app.coordena_curso_do_estagio(p_estagio_id) or app.representa_concedente_do_estagio(p_estagio_id)
    when p_tipo = 'PLANO_ATIVIDADES' then
      app.coordena_curso_do_estagio(p_estagio_id) or app.e_estudante_do_estagio(p_estagio_id)
      or app.e_responsavel_vigente(p_estagio_id, 'ORIENTADOR')
    else false
  end
$$;

-- RF071 (RN-38), extended for estágio documents. Sensitive ones (DISPENSA_DURACAO, and the
-- medical certificates of Fase 5) only for the student and coordination, never the
-- administrator. Replaces the version of functions/06.
create or replace function app.pode_baixar_documento(p_documento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documento d
    where d.id = p_documento_id
      and d.eliminado_em is null
      and (
        (d.tipo = 'CONVENIO' and (
          app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO') or app.representa_concedente(d.concedente_id)
        ))
        or (d.estagio_id is not null and not d.sensivel and app.pode_ler_estagio(d.estagio_id))
        or (d.estagio_id is not null and d.sensivel
            and (app.coordena_curso_do_estagio(d.estagio_id) or app.e_estudante_do_estagio(d.estagio_id)))
        or (d.enviado_por_usuario_id = app.usuario_atual_id() and not d.sensivel)
      )
  )
$$;

revoke all on function app.estudante_atual_id() from public;
revoke all on function app.e_estudante_do_estagio(uuid) from public;
revoke all on function app.e_responsavel_vigente(uuid, public.papel_responsavel) from public;
revoke all on function app.coordena_curso_do_estagio(uuid) from public;
revoke all on function app.representa_concedente_do_estagio(uuid) from public;
revoke all on function app.pode_ler_estagio(uuid) from public;
revoke all on function app.pode_assinar(uuid, public.parte_assinatura) from public;
revoke all on function app.dias_usados_no_par(uuid, uuid, uuid) from public;
revoke all on function app.tem_outro_estagio_ativo(uuid, uuid) from public;
revoke all on function app.historico_estagios_concedente(uuid) from public;
revoke all on function app.validar_alteracao_estagio() from public;
revoke all on function app.validar_alteracao_plano() from public;
revoke all on function app.validar_responsavel() from public;
revoke all on function app.validar_assinatura() from public;
revoke all on function app.validar_alteracao_aditivo() from public;
revoke all on function app.efetivar_aditivo(uuid) from public;

grant execute on function app.estudante_atual_id() to app_runtime;
grant execute on function app.e_estudante_do_estagio(uuid) to app_runtime;
grant execute on function app.e_responsavel_vigente(uuid, public.papel_responsavel) to app_runtime;
grant execute on function app.coordena_curso_do_estagio(uuid) to app_runtime;
grant execute on function app.representa_concedente_do_estagio(uuid) to app_runtime;
grant execute on function app.pode_ler_estagio(uuid) to app_runtime;
grant execute on function app.pode_assinar(uuid, public.parte_assinatura) to app_runtime;
grant execute on function app.dias_usados_no_par(uuid, uuid, uuid) to app_runtime;
grant execute on function app.tem_outro_estagio_ativo(uuid, uuid) to app_runtime;
grant execute on function app.historico_estagios_concedente(uuid) to app_runtime;
grant execute on function app.efetivar_aditivo(uuid) to app_runtime;
