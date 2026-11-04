-- Notificações dentro do sistema (RF012, RF028, RF035, RF040, RF069, RF070; DER-LOGICO §4.9)
-- No e-mail (closed decision). Events notify by trigger, in the transaction of the fact; the
-- daily routine (app.rotina_diaria, called by /api/cron/diaria) covers deadlines. Messages say
-- what happened and where to look, never health data nor report content (RN-38).

-- Writes one notification; the deduplication key makes routines and repeated events idempotent.
-- Inactive users are not notified.
create or replace function app.notificar(
  p_destinatario uuid,
  p_tipo public.tipo_notificacao,
  p_titulo text,
  p_mensagem text,
  p_entidade text,
  p_entidade_id uuid,
  p_chave text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notificacao (destinatario_usuario_id, tipo, titulo, mensagem, entidade, entidade_id, chave_deduplicacao)
  select u.id, p_tipo, p_titulo, p_mensagem, p_entidade, p_entidade_id, p_chave
  from public.usuario u
  where u.id = p_destinatario and u.situacao = 'ATIVO'
  on conflict (chave_deduplicacao) do nothing
$$;

-- RF070 "conforme o vínculo de cada um com o item": everyone linked to an internship, by role
create or replace function app.pessoas_do_estagio(p_estagio_id uuid)
returns table (usuario_id uuid, papel text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.usuario_id, 'ESTUDANTE'
  from public.estagio g join public.estudante e on e.id = g.estudante_id
  where g.id = p_estagio_id
  union
  select r.usuario_id, r.papel::text
  from public.responsavel_estagio r
  where r.estagio_id = p_estagio_id
    and (r.vigencia_fim is null or (r.vigencia_fim > app.hoje() and r.vigencia_fim > r.vigencia_inicio))
  union
  select v.usuario_id, v.perfil::text
  from public.estagio g
  join public.vinculo_perfil v on (v.perfil = 'COORDENACAO' and v.curso_id = g.curso_id)
                               or (v.perfil = 'CONCEDENTE' and v.concedente_id = g.concedente_id)
  where g.id = p_estagio_id and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
$$;

create or replace function app.notificar_estagio(
  p_estagio_id uuid,
  p_papeis text[],
  p_tipo public.tipo_notificacao,
  p_titulo text,
  p_mensagem text,
  p_chave text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pessoa record;
begin
  for v_pessoa in select distinct p.usuario_id from app.pessoas_do_estagio(p_estagio_id) p where p.papel = any (p_papeis) loop
    perform app.notificar(v_pessoa.usuario_id, p_tipo, p_titulo, p_mensagem, 'estagio', p_estagio_id,
                          case when p_chave is null then null else p_chave || ':' || v_pessoa.usuario_id end);
  end loop;
end
$$;

-- ---------------------------------------------------------------- events (triggers)

-- RF070: the internship changes situation
create or replace function app.notificar_situacao_estagio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao <> old.situacao then
    perform app.notificar_estagio(
      new.id, array['ESTUDANTE', 'ORIENTADOR', 'SUPERVISOR', 'COORDENACAO'], 'MUDANCA_SITUACAO',
      'Situação do estágio alterada',
      format('O estágio passou de %s para %s.', old.situacao, new.situacao),
      format('RF070:situacao:%s:%s', new.id, new.situacao)
    );
  end if;
  return null;
end
$$;

-- RF035: a replaced advisor or supervisor; the student, the concedente and the new responsible
create or replace function app.notificar_substituicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.substitui_responsavel_id is not null then
    perform app.notificar_estagio(
      new.estagio_id, array['ESTUDANTE', 'CONCEDENTE'], 'SUBSTITUICAO_RESPONSAVEL',
      'Responsável substituído',
      format('O %s do estágio foi substituído a partir de %s.', lower(new.papel::text), to_char(new.vigencia_inicio, 'DD/MM/YYYY')),
      format('RF035:%s', new.id)
    );
    perform app.notificar(
      new.usuario_id, 'SUBSTITUICAO_RESPONSAVEL', 'Você é o novo responsável por um estágio',
      format('Você passou a ser %s do estágio a partir de %s.', lower(new.papel::text), to_char(new.vigencia_inicio, 'DD/MM/YYYY')),
      'estagio', new.estagio_id, format('RF035:%s:novo', new.id)
    );
  end if;
  return null;
end
$$;

-- RF028: a divergence case is signaled to the advisor
create or replace function app.notificar_divergencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notificar_estagio(
    new.estagio_id, array['ORIENTADOR'], 'DIVERGENCIA_CARGA_HORARIA',
    'Divergência de carga horária',
    format('As horas registradas divergem das previstas além da tolerância de %s%%.', new.tolerancia_percentual),
    format('RF028:%s', new.id)
  );
  return null;
end
$$;

-- RF070: the student learns the decision on its report (never its content)
create or replace function app.notificar_parecer_relatorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio uuid := app.estagio_da_versao(new.versao_relatorio_id);
begin
  perform app.notificar_estagio(
    v_estagio, array['ESTUDANTE'], 'RELATORIO_ANALISADO',
    case new.decisao when 'APROVADO' then 'Relatório aprovado' else 'Relatório devolvido' end,
    case new.decisao when 'APROVADO' then 'O orientador aprovou o relatório.' else 'O orientador devolveu o relatório para correção.' end,
    format('RF070:parecer:%s', new.id)
  );
  return null;
end
$$;

-- RF070: the student learns the decision on its complementary activity
create or replace function app.notificar_analise_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
begin
  select e.usuario_id into v_usuario
    from public.atividade_complementar a join public.estudante e on e.id = a.estudante_id
   where a.id = new.atividade_id;
  perform app.notificar(
    v_usuario, 'ATIVIDADE_ANALISADA',
    case new.decisao when 'APROVADA' then 'Atividade aprovada' when 'RECUSADA' then 'Atividade recusada' else 'Atividade devolvida' end,
    case new.decisao
      when 'APROVADA' then format('A coordenação aprovou a atividade: %s h aproveitadas.', new.horas_aproveitadas_minutos / 60.0)
      when 'RECUSADA' then 'A coordenação recusou a atividade; veja o motivo na atividade.'
      else 'A coordenação devolveu a atividade para complementação.'
    end,
    'atividade_complementar', new.atividade_id, format('RF070:analise:%s', new.id)
  );
  return null;
end
$$;

-- Only the reading of a notification changes
create or replace function app.validar_alteracao_notificacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'lida_em') is distinct from (to_jsonb(old) - 'lida_em') then
    raise exception 'REGISTRO_IMUTAVEL: só a leitura da notificação muda' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke all on function app.validar_alteracao_notificacao() from public;

-- ---------------------------------------------------------------- daily routine

-- RF012, RF040, RF069: deadlines. Runs without identity (server timer), so it writes only
-- notifications; the deduplication keys make a second run of the day a no-op. Returns how many
-- notifications each check created.
create or replace function app.rotina_diaria()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := app.hoje();
  v_antecedencia integer;
  v_antes integer;
  v_convenios integer;
  v_relatorios integer;
  v_guarda integer;
  v_item record;
  v_pessoa record;
begin
  select coalesce((
    select p.antecedencia_alerta_convenio_dias from public.parametro_institucional p
    where p.vigencia_inicio <= v_hoje order by p.vigencia_inicio desc limit 1
  ), 60) into v_antecedencia;

  -- RF012: agreements lapsing within the lead time with no later period, to coordination,
  -- administration and the concedente's representatives
  select count(*) into v_antes from public.notificacao;
  for v_item in
    select cv.id, c.id as convenio_id, c.numero, c.concedente_id, cv.vigencia_fim
    from public.convenio c
    join public.convenio_vigencia cv on cv.convenio_id = c.id
    where c.situacao = 'ATIVO'
      and cv.vigencia_fim between v_hoje and v_hoje + v_antecedencia
      and not exists (select 1 from public.convenio_vigencia o where o.convenio_id = c.id and o.vigencia_fim > cv.vigencia_fim)
  loop
    for v_pessoa in
      select distinct v.usuario_id from public.vinculo_perfil v
      where (v.perfil in ('COORDENACAO', 'ADMINISTRADOR') or (v.perfil = 'CONCEDENTE' and v.concedente_id = v_item.concedente_id))
        and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
    loop
      perform app.notificar(
        v_pessoa.usuario_id, 'CONVENIO_A_VENCER', 'Convênio a vencer',
        format('O convênio %s vence em %s, sem renovação registrada.', v_item.numero, to_char(v_item.vigencia_fim, 'DD/MM/YYYY')),
        'convenio', v_item.convenio_id, format('RF012:%s:%s', v_item.id, v_pessoa.usuario_id)
      );
    end loop;
  end loop;
  select count(*) - v_antes into v_convenios from public.notificacao;

  -- RF040: reports due (period ended) of ATIVO internships, to the student and the advisor:
  -- pending within 7 days of the deadline, late after it (each once)
  v_antes := v_antes + v_convenios;
  for v_item in
    select r.id, r.estagio_id, r.tipo, r.sequencia, r.prazo_entrega
    from public.relatorio r join public.estagio g on g.id = r.estagio_id
    where g.situacao = 'ATIVO' and r.situacao in ('PENDENTE', 'DEVOLVIDO') and r.periodo_fim < v_hoje
      and r.prazo_entrega <= v_hoje + 7
  loop
    perform app.notificar_estagio(
      v_item.estagio_id, array['ESTUDANTE', 'ORIENTADOR'],
      case when v_item.prazo_entrega < v_hoje then 'RELATORIO_ATRASADO' else 'RELATORIO_PENDENTE' end::public.tipo_notificacao,
      case when v_item.prazo_entrega < v_hoje then 'Relatório em atraso' else 'Relatório a entregar' end,
      format('O %s tem prazo em %s.', case v_item.tipo when 'FINAL' then 'relatório final' else 'relatório ' || v_item.sequencia end,
             to_char(v_item.prazo_entrega, 'DD/MM/YYYY')),
      format('RF040:%s:%s', case when v_item.prazo_entrega < v_hoje then 'atrasado' else 'pendente' end, v_item.id)
    );
  end loop;
  select count(*) - v_antes into v_relatorios from public.notificacao;

  -- RF069: documents whose retention period is over, to the administrators (who decide the
  -- elimination; it is never automatic)
  v_antes := v_antes + v_relatorios;
  for v_item in
    select d.id, d.tipo, d.data_liberacao_guarda from public.documento d
    where d.data_liberacao_guarda <= v_hoje and d.eliminado_em is null
  loop
    for v_pessoa in
      select distinct v.usuario_id from public.vinculo_perfil v
      where v.perfil = 'ADMINISTRADOR' and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
    loop
      perform app.notificar(
        v_pessoa.usuario_id, 'PRAZO_GUARDA_ATINGIDO', 'Prazo de guarda atingido',
        format('Um documento do tipo %s atingiu o prazo de guarda em %s.', v_item.tipo, to_char(v_item.data_liberacao_guarda, 'DD/MM/YYYY')),
        'documento', v_item.id, format('RF069:%s:%s', v_item.id, v_pessoa.usuario_id)
      );
    end loop;
  end loop;
  select count(*) - v_antes into v_guarda from public.notificacao;

  return jsonb_build_object('convenios_a_vencer', v_convenios, 'relatorios', v_relatorios, 'prazo_guarda', v_guarda);
end
$$;

revoke all on function app.notificar(uuid, public.tipo_notificacao, text, text, text, uuid, text) from public;
revoke all on function app.pessoas_do_estagio(uuid) from public;
revoke all on function app.notificar_estagio(uuid, text[], public.tipo_notificacao, text, text, text) from public;
revoke all on function app.notificar_situacao_estagio() from public;
revoke all on function app.notificar_substituicao() from public;
revoke all on function app.notificar_divergencia() from public;
revoke all on function app.notificar_parecer_relatorio() from public;
revoke all on function app.notificar_analise_atividade() from public;
revoke all on function app.rotina_diaria() from public;

-- The routine runs as app_runtime without identity (/api/cron/diaria, behind CRON_SECRET)
grant execute on function app.rotina_diaria() to app_runtime;
