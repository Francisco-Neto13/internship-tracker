-- M05 Frequência e carga horária (RF023 to RF030, RN-07 to RN-09; DER-LOGICO §4.5, §5.3)
-- The triggers are the barrier: the services check the same rules first for a clear
-- message, but no path (route, script, race) records hours the rules forbid.

-- Calendar date of the institution (America/Sao_Paulo), whatever the session time zone
create or replace function app.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- RF006, RF024 (DER §5.5): parameters in force on a date, or the legal defaults when no
-- version was recorded (Lei 11.788/2008, art. 10, II: 6 h a day, 30 h a week; tolerance of
-- 10%). Mirrors PARAMETROS_PADRAO in src/modules/academico/domain/parametros.ts (tested).
create or replace function app.parametros_em(p_data date)
returns table (
  parametro_id uuid,
  limite_diario_obrigatorio_minutos integer,
  limite_diario_nao_obrigatorio_minutos integer,
  limite_semanal_minutos integer,
  bloquear_excedente boolean,
  tolerancia_divergencia_percentual numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         coalesce(p.limite_diario_obrigatorio_minutos, 360),
         coalesce(p.limite_diario_nao_obrigatorio_minutos, 360),
         coalesce(p.limite_semanal_minutos, 1800),
         coalesce(p.bloquear_excedente, true),
         coalesce(p.tolerancia_divergencia_percentual, 10.00)
  from (select 1) as padrao
  left join lateral (
    select * from public.parametro_institucional
    where vigencia_inicio <= p_data
    order by vigencia_inicio desc
    limit 1
  ) p on true
$$;

-- Serializes the writes that depend on sums over an internship (weekly limit, homologation
-- totals). Locks only an internship the caller can read, so it is no lever to block others.
create or replace function app.travar_estagio(p_estagio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.pode_ler_estagio(p_estagio_id) then
    return false;
  end if;
  perform 1 from public.estagio where id = p_estagio_id for update;
  return found;
end
$$;

-- RF030 extension point: days inside a valid leave do not take entries. Leaves arrive with
-- the afastamento table (Fase 5), which replaces this body; until then no day is a leave.
create or replace function app.em_afastamento(p_estagio_id uuid, p_data date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false
$$;

-- RF023 to RF025 (DER §5.3, D2, D4): the entry of a day of an ATIVO internship, on a past or
-- current date inside the internship, outside a leave. Daily limit by internship type and
-- weekly limit by ISO week (Monday to Sunday), from the parameters in force on that day. Over
-- a limit: refused when the institution blocks, otherwise recorded as SINALIZADO.
create or replace function app.validar_registro_frequencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio record;
  v_parametros record;
  v_substituido record;
  v_usuario uuid := app.usuario_atual_id();
  v_limite_diario integer;
  v_semana integer;
begin
  select g.situacao, g.tipo, g.data_inicio, g.data_fim_prevista into v_estagio
    from public.estagio g where g.id = new.estagio_id for update;
  if v_estagio.situacao is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: só estágio ativo recebe lançamentos de frequência' using errcode = 'P0001';
  end if;
  if new.data < v_estagio.data_inicio or new.data > v_estagio.data_fim_prevista then
    raise exception 'DATA_FORA_DO_ESTAGIO: % fora do período do estágio', new.data using errcode = 'P0001';
  end if;
  if new.data > app.hoje() then
    raise exception 'DATA_FUTURA: não se registra frequência de dia que ainda não aconteceu' using errcode = 'P0001';
  end if;
  if app.em_afastamento(new.estagio_id, new.data) then
    raise exception 'DIA_EM_AFASTAMENTO: % está dentro de um afastamento registrado', new.data using errcode = 'P0001';
  end if;
  if v_usuario is not null and new.registrado_por_usuario_id is distinct from v_usuario then
    raise exception 'REGISTRO_DE_TERCEIRO: o lançamento é registrado em nome de quem o faz' using errcode = 'P0001';
  end if;

  if new.substitui_registro_id is null then
    -- RF023: the student records the hours; corrections by others go through substitution
    if v_usuario is not null and not app.e_estudante_do_estagio(new.estagio_id) then
      raise exception 'LANCAMENTO_RESTRITO_AO_ESTUDANTE: só o estudante registra a própria frequência' using errcode = 'P0001';
    end if;
  else
    -- RF029: the replaced entry was moved to SUBSTITUIDO in this same transaction, by someone
    -- allowed to (app.validar_alteracao_frequencia); the correction is for the same day
    select r.estagio_id, r.data, r.situacao into v_substituido
      from public.registro_frequencia r where r.id = new.substitui_registro_id;
    if v_substituido.estagio_id is distinct from new.estagio_id or v_substituido.data is distinct from new.data
       or v_substituido.situacao is distinct from 'SUBSTITUIDO' then
      raise exception 'AJUSTE_INVALIDO: o ajuste substitui um lançamento do mesmo dia, marcado como substituído' using errcode = 'P0001';
    end if;
  end if;

  select * into v_parametros from app.parametros_em(new.data);
  v_limite_diario := case v_estagio.tipo
    when 'OBRIGATORIO' then v_parametros.limite_diario_obrigatorio_minutos
    else v_parametros.limite_diario_nao_obrigatorio_minutos
  end;
  select coalesce(sum(r.duracao_minutos), 0)::integer into v_semana
    from public.registro_frequencia r
   where r.estagio_id = new.estagio_id
     and r.situacao in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO')
     and r.data >= date_trunc('week', new.data)::date
     and r.data < date_trunc('week', new.data)::date + 7;

  new.parametro_institucional_id := v_parametros.parametro_id;
  new.limite_diario_aplicado_minutos := v_limite_diario;
  new.limite_semanal_aplicado_minutos := v_parametros.limite_semanal_minutos;
  new.homologacao_id := null;
  new.justificativa_cancelamento := null;

  if new.duracao_minutos > v_limite_diario or v_semana + new.duracao_minutos > v_parametros.limite_semanal_minutos then
    if v_parametros.bloquear_excedente then
      raise exception 'LIMITE_JORNADA_EXCEDIDO: % min no dia (limite %), % min na semana (limite %)',
        new.duracao_minutos, v_limite_diario, v_semana + new.duracao_minutos, v_parametros.limite_semanal_minutos
        using errcode = 'P0001';
    end if;
    new.excedeu_limite := true;
    new.situacao := 'SINALIZADO';
  else
    new.excedeu_limite := false;
    new.situacao := 'REGISTRADO';
  end if;
  return new;
end
$$;

-- RF027, RF029 (DER §4.5, §9.1 P5): content never changes. The supervisor homologates, the
-- student or the coordination corrects or cancels what is not homologated, and only the
-- coordination replaces a homologated entry (which then needs a new homologation).
create or replace function app.validar_alteracao_frequencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := app.usuario_atual_id();
begin
  if (to_jsonb(new) - array['situacao', 'homologacao_id', 'justificativa_cancelamento', 'atualizado_em'])
     is distinct from (to_jsonb(old) - array['situacao', 'homologacao_id', 'justificativa_cancelamento', 'atualizado_em']) then
    raise exception 'REGISTRO_IMUTAVEL: o conteúdo do lançamento não muda; registre um ajuste' using errcode = 'P0001';
  end if;
  if new.situacao = old.situacao then
    if new.homologacao_id is distinct from old.homologacao_id or new.justificativa_cancelamento is distinct from old.justificativa_cancelamento then
      raise exception 'REGISTRO_IMUTAVEL: homologação e cancelamento só mudam com a situação' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if (select g.situacao from public.estagio g where g.id = new.estagio_id) is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: a frequência só muda com o estágio ativo' using errcode = 'P0001';
  end if;
  if new.situacao <> 'HOMOLOGADO' and new.homologacao_id is distinct from old.homologacao_id then
    raise exception 'REGISTRO_IMUTAVEL: a homologação só é atribuída ao homologar' using errcode = 'P0001';
  end if;

  if old.situacao in ('REGISTRADO', 'SINALIZADO') and new.situacao = 'HOMOLOGADO' then
    if not exists (
      select 1 from public.homologacao_frequencia h
      where h.id = new.homologacao_id and h.estagio_id = new.estagio_id and new.data between h.periodo_inicio and h.periodo_fim
    ) then
      raise exception 'HOMOLOGACAO_INVALIDA: a homologação não cobre este lançamento' using errcode = 'P0001';
    end if;
    if v_usuario is not null and not app.e_responsavel_vigente(new.estagio_id, 'SUPERVISOR') then
      raise exception 'HOMOLOGACAO_RESTRITA_AO_SUPERVISOR: só o supervisor do estágio homologa' using errcode = 'P0001';
    end if;
  elsif old.situacao in ('REGISTRADO', 'SINALIZADO') and new.situacao in ('SUBSTITUIDO', 'CANCELADO') then
    if v_usuario is not null and not (app.e_estudante_do_estagio(new.estagio_id) or app.coordena_curso_do_estagio(new.estagio_id)) then
      raise exception 'AJUSTE_RESTRITO: só o estudante ou a coordenação corrigem o lançamento' using errcode = 'P0001';
    end if;
  elsif old.situacao = 'HOMOLOGADO' and new.situacao = 'SUBSTITUIDO' then
    if v_usuario is not null and not app.coordena_curso_do_estagio(new.estagio_id) then
      raise exception 'LANCAMENTO_HOMOLOGADO: lançamento homologado só é corrigido pela coordenação' using errcode = 'P0001';
    end if;
  elsif old.situacao = 'HOMOLOGADO' then
    raise exception 'LANCAMENTO_HOMOLOGADO: lançamento homologado não é cancelado; a coordenação o substitui' using errcode = 'P0001';
  else
    raise exception 'TRANSICAO_FREQUENCIA_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF029, checked at commit: an entry marked SUBSTITUIDO has its correction in the same
-- transaction, so hours are never silently dropped
create or replace function app.exigir_substituto_frequencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'SUBSTITUIDO' and old.situacao <> 'SUBSTITUIDO'
     and not exists (select 1 from public.registro_frequencia r where r.substitui_registro_id = new.id) then
    raise exception 'AJUSTE_SEM_SUBSTITUTO: o lançamento substituído precisa do lançamento que o corrige' using errcode = 'P0001';
  end if;
  return null;
end
$$;

-- RF027: the supervisor in force homologates a closed period of an ATIVO internship
create or replace function app.validar_homologacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := app.usuario_atual_id();
begin
  if (select g.situacao from public.estagio g where g.id = new.estagio_id) is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: só estágio ativo tem frequência homologada' using errcode = 'P0001';
  end if;
  if new.periodo_fim > app.hoje() then
    raise exception 'DATA_FUTURA: o período homologado termina no máximo hoje' using errcode = 'P0001';
  end if;
  if v_usuario is not null and (new.homologado_por_usuario_id is distinct from v_usuario
     or not app.e_responsavel_vigente(new.estagio_id, 'SUPERVISOR')) then
    raise exception 'HOMOLOGACAO_RESTRITA_AO_SUPERVISOR: só o supervisor do estágio homologa, em nome próprio' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF027, checked at commit: the homologation covers at least one entry and its total is the
-- sum of the entries it marked
create or replace function app.conferir_homologacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  select coalesce(sum(r.duracao_minutos), 0)::integer into v_total
    from public.registro_frequencia r where r.homologacao_id = new.id;
  if v_total = 0 or v_total <> new.minutos_homologados then
    raise exception 'HOMOLOGACAO_INCONSISTENTE: % min informados, % min marcados', new.minutos_homologados, v_total
      using errcode = 'P0001';
  end if;
  return null;
end
$$;

-- RF028: a divergence case is opened by the system and closed by the advisor's analysis
create or replace function app.validar_alteracao_divergencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['situacao', 'parecer', 'analisada_por_usuario_id', 'analisada_em', 'atualizado_em'])
     is distinct from (to_jsonb(old) - array['situacao', 'parecer', 'analisada_por_usuario_id', 'analisada_em', 'atualizado_em']) then
    raise exception 'REGISTRO_IMUTAVEL: os números da divergência não mudam' using errcode = 'P0001';
  end if;
  if old.situacao <> 'ABERTA' then
    raise exception 'DIVERGENCIA_JA_ANALISADA: a divergência já foi analisada' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null and (
    new.analisada_por_usuario_id is distinct from app.usuario_atual_id()
    or not app.e_responsavel_vigente(new.estagio_id, 'ORIENTADOR')
  ) then
    raise exception 'ANALISE_RESTRITA_AO_ORIENTADOR: só o professor orientador analisa a divergência' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function app.hoje() from public;
revoke all on function app.parametros_em(date) from public;
revoke all on function app.travar_estagio(uuid) from public;
revoke all on function app.em_afastamento(uuid, date) from public;
revoke all on function app.validar_registro_frequencia() from public;
revoke all on function app.validar_alteracao_frequencia() from public;
revoke all on function app.exigir_substituto_frequencia() from public;
revoke all on function app.validar_homologacao() from public;
revoke all on function app.conferir_homologacao() from public;
revoke all on function app.validar_alteracao_divergencia() from public;

grant execute on function app.hoje() to app_runtime;
grant execute on function app.parametros_em(date) to app_runtime;
grant execute on function app.travar_estagio(uuid) to app_runtime;
grant execute on function app.em_afastamento(uuid, date) to app_runtime;
