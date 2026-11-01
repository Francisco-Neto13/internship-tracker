-- M04 Afastamento (RF030, RF059, RF060, RN-25; DER-LOGICO §4.4, D1)
-- The coordination registers a leave of an ATIVO internship with its certificate. The planned
-- end moves forward by the same number of calendar days, up to the 2-year cap at the
-- concedente (Lei 11.788/2008, art. 11; no cap with the exemption of the internship, D5).
-- A correction is a new row that replaces the previous one (never overwritten).

-- Leave periods of an internship, dates only (no type nor description, RN-38): whoever reads
-- the internship needs them for frequency and workload (supervisor and concedente included)
create or replace function app.periodos_afastamento(p_estagio_id uuid)
returns table (data_inicio date, data_fim date)
language sql
stable
security definer
set search_path = ''
as $$
  select a.data_inicio, a.data_fim
  from public.afastamento a
  where a.estagio_id = p_estagio_id and a.situacao = 'VALIDO' and app.pode_ler_estagio(p_estagio_id)
  order by a.data_inicio
$$;

-- Last day allowed by the cap at the concedente, or null when the internship is exempt.
-- Same rule as limiteDuracaoMaxima (src/modules/estagios/domain/tce.ts)
create or replace function app.teto_duracao_estagio(p_estagio_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case when g.dispensa_duracao_maxima then null else
    (g.data_inicio + make_interval(months => coalesce(
      (select p.duracao_maxima_meses from public.parametro_institucional p
        where p.vigencia_inicio <= g.data_inicio order by p.vigencia_inicio desc limit 1), 24)))::date
    - 1 - app.dias_usados_no_par(g.estudante_id, g.concedente_id, g.id)
  end
  from public.estagio g
  where g.id = p_estagio_id
$$;

-- BEFORE INSERT: checks and the extension. The substitution marks the previous row as
-- SUBSTITUIDO here, before the exclusion constraint compares the periods.
create or replace function app.validar_afastamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio public.estagio%rowtype;
  v_anterior public.afastamento%rowtype;
  v_base date;
  v_teto date;
  v_dias integer := new.data_fim - new.data_inicio + 1;
begin
  select * into v_estagio from public.estagio where id = new.estagio_id for update;
  if not found then
    raise exception 'ESTAGIO_NAO_ENCONTRADO: estágio inexistente' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null then
    if not app.coordena_curso_do_estagio(new.estagio_id) then
      raise exception 'AFASTAMENTO_RESTRITO: só a coordenação do curso registra afastamento' using errcode = 'P0001';
    end if;
    new.registrado_por_usuario_id := app.usuario_atual_id();
  end if;
  if v_estagio.situacao <> 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: afastamento só em estágio ativo' using errcode = 'P0001';
  end if;

  v_base := v_estagio.data_fim_prevista;
  if new.substitui_afastamento_id is not null then
    select * into v_anterior from public.afastamento where id = new.substitui_afastamento_id for update;
    if not found or v_anterior.estagio_id <> new.estagio_id or v_anterior.situacao <> 'VALIDO' then
      raise exception 'SUBSTITUICAO_AFASTAMENTO_INVALIDA: só um afastamento válido do mesmo estágio é corrigido' using errcode = 'P0001';
    end if;
    -- The correction undoes the previous extension and computes its own
    v_base := v_base - v_anterior.dias_extensao;
    update public.afastamento set situacao = 'SUBSTITUIDO' where id = v_anterior.id;
  end if;

  if new.data_inicio < v_estagio.data_inicio or new.data_fim > v_base then
    raise exception 'AFASTAMENTO_FORA_DO_PERIODO: o afastamento fica entre % e %', v_estagio.data_inicio, v_base using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.documento d
    where d.id = new.documento_id and d.tipo = 'ATESTADO_AFASTAMENTO' and d.estagio_id = new.estagio_id and d.eliminado_em is null
  ) then
    raise exception 'DOCUMENTO_INVALIDO: o comprovante é um atestado de afastamento deste estágio' using errcode = 'P0001';
  end if;
  -- RF030: days already with hours are corrected or cancelled before the leave is registered
  if exists (
    select 1 from public.registro_frequencia r
    where r.estagio_id = new.estagio_id and r.situacao in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO')
      and r.data between new.data_inicio and new.data_fim
  ) then
    raise exception 'AFASTAMENTO_COM_LANCAMENTOS: há lançamentos de frequência vigentes no período' using errcode = 'P0001';
  end if;

  -- D1, RF062: same number of calendar days, up to the cap
  v_teto := app.teto_duracao_estagio(new.estagio_id);
  new.dias_extensao := case when v_teto is null then v_dias else least(v_dias, greatest(0, v_teto - v_base)) end;
  new.data_fim_prevista_anterior := v_base;
  new.data_fim_prevista_nova := v_base + new.dias_extensao;
  new.situacao := 'VALIDO';
  new.criado_em := now();
  new.atualizado_em := now();
  return new;
end
$$;

-- AFTER INSERT: moves the planned end (the internship trigger accepts it because a leave was
-- registered in this transaction) and warns the coordination when the cap cut the extension
create or replace function app.aplicar_afastamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.estagio set data_fim_prevista = new.data_fim_prevista_nova
  where id = new.estagio_id and data_fim_prevista is distinct from new.data_fim_prevista_nova;
  if new.dias_extensao < new.data_fim - new.data_inicio + 1 then
    perform app.notificar_estagio(
      new.estagio_id, array['COORDENACAO'], 'DURACAO_MAXIMA_ATINGIDA',
      'Duração máxima atingida',
      format('O afastamento estendeu o estágio em %s de %s dias: o teto de duração na concedente foi atingido.',
             new.dias_extensao, new.data_fim - new.data_inicio + 1),
      format('RF060:teto:%s', new.id)
    );
  end if;
  return null;
end
$$;

-- Only VALIDO -> SUBSTITUIDO, nothing else changes (a generated column is null in NEW here)
create or replace function app.validar_alteracao_afastamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['situacao', 'atualizado_em', 'dias_corridos']) is distinct from (to_jsonb(old) - array['situacao', 'atualizado_em', 'dias_corridos'])
     or not (old.situacao = 'VALIDO' and new.situacao = 'SUBSTITUIDO') then
    raise exception 'REGISTRO_IMUTAVEL: o afastamento só é substituído por um novo registro' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create or replace function app.exigir_substituto_afastamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'SUBSTITUIDO' and old.situacao <> 'SUBSTITUIDO'
     and not exists (select 1 from public.afastamento a where a.substitui_afastamento_id = new.id) then
    raise exception 'SUBSTITUICAO_AFASTAMENTO_INVALIDA: o afastamento substituído precisa do registro que o corrige' using errcode = 'P0001';
  end if;
  return null;
end
$$;

revoke all on function app.periodos_afastamento(uuid) from public;
revoke all on function app.teto_duracao_estagio(uuid) from public;
revoke all on function app.validar_afastamento() from public;
revoke all on function app.aplicar_afastamento() from public;
revoke all on function app.validar_alteracao_afastamento() from public;
revoke all on function app.exigir_substituto_afastamento() from public;

grant execute on function app.periodos_afastamento(uuid) to app_runtime;
