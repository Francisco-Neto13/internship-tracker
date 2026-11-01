-- M04 Encerramento do estágio (RF045, RF063, RF064, RN-27; DER-LOGICO §5.2, §5.12)
-- Conclusion is an UPDATE of the coordination that the guards of app.impedimentos_conclusao
-- may refuse. Rescission is a rescisao row: its triggers consolidate the hours, cancel the
-- entries after the date and move the internship to RESCINDIDO, all in one transaction.
-- Both ends close what was open (app.encerrar_estagio).

-- BEFORE INSERT on rescisao: who, when and the consolidated hours (RF064)
create or replace function app.validar_rescisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio public.estagio%rowtype;
begin
  select * into v_estagio from public.estagio where id = new.estagio_id for update;
  if not found then
    raise exception 'ESTAGIO_NAO_ENCONTRADO: estágio inexistente' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null then
    if not app.coordena_curso_do_estagio(new.estagio_id) then
      raise exception 'RESCISAO_RESTRITA: só a coordenação do curso registra a rescisão' using errcode = 'P0001';
    end if;
    new.decidido_por_usuario_id := app.usuario_atual_id();
  end if;
  if v_estagio.situacao <> 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: só um estágio ativo é rescindido' using errcode = 'P0001';
  end if;
  if new.data_rescisao < v_estagio.data_inicio or new.data_rescisao > app.hoje() then
    raise exception 'RESCISAO_DATA_INVALIDA: a data fica entre o início do estágio (%) e hoje', v_estagio.data_inicio using errcode = 'P0001';
  end if;
  if new.documento_id is not null and not exists (
    select 1 from public.documento d
    where d.id = new.documento_id and d.tipo = 'RESCISAO' and d.estagio_id = new.estagio_id and d.eliminado_em is null
  ) then
    raise exception 'DOCUMENTO_INVALIDO: o termo de rescisão é um documento deste estágio' using errcode = 'P0001';
  end if;
  -- A homologated day after the date contradicts it: the coordination replaces it first
  if exists (
    select 1 from public.registro_frequencia r
    where r.estagio_id = new.estagio_id and r.situacao = 'HOMOLOGADO' and r.data > new.data_rescisao
  ) then
    raise exception 'RESCISAO_COM_HOMOLOGADOS_POSTERIORES: há horas homologadas depois da data da rescisão' using errcode = 'P0001';
  end if;

  select coalesce(sum(r.duracao_minutos), 0)::integer,
         coalesce(sum(r.duracao_minutos) filter (where r.situacao = 'HOMOLOGADO'), 0)::integer
    into new.minutos_cumpridos_consolidados, new.minutos_homologados_consolidados
    from public.registro_frequencia r
   where r.estagio_id = new.estagio_id
     and r.situacao in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO')
     and r.data <= new.data_rescisao;
  new.criado_em := now();
  return new;
end
$$;

-- AFTER INSERT on rescisao: entries after the date are cancelled while the internship is still
-- ATIVO (the frequency trigger requires it), then the internship ends
create or replace function app.aplicar_rescisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registro_frequencia
     set situacao = 'CANCELADO',
         justificativa_cancelamento = format('Cancelado pela rescisão do estágio em %s', to_char(new.data_rescisao, 'DD/MM/YYYY'))
   where estagio_id = new.estagio_id and situacao in ('REGISTRADO', 'SINALIZADO') and data > new.data_rescisao;
  update public.estagio set situacao = 'RESCINDIDO', encerrado_em = now() where id = new.estagio_id;
  return null;
end
$$;

-- AFTER UPDATE OF situacao on estagio, ATIVO -> CONCLUIDO | RESCINDIDO (DER §5.2, §5.12): the
-- pending amendment is cancelled and the responsibles leave on the end date. Runs after the
-- situation notification (trigger name order), so they are still told of the end.
create or replace function app.encerrar_estagio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data date;
begin
  if not (old.situacao = 'ATIVO' and new.situacao in ('CONCLUIDO', 'RESCINDIDO')) then
    return null;
  end if;
  select coalesce((select r.data_rescisao from public.rescisao r where r.estagio_id = new.id), app.hoje()) into v_data;
  update public.aditivo
     set situacao = 'CANCELADO', motivo_cancelamento = 'Estágio encerrado antes das assinaturas'
   where estagio_id = new.id and situacao = 'AGUARDANDO_ASSINATURAS';
  update public.responsavel_estagio
     set vigencia_fim = greatest(v_data, vigencia_inicio)
   where estagio_id = new.id and (vigencia_fim is null or vigencia_fim > v_data);
  return null;
end
$$;

create or replace function app.bloquear_alteracao_rescisao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'REGISTRO_IMUTAVEL: a rescisão não muda' using errcode = 'P0001';
end
$$;

revoke all on function app.validar_rescisao() from public;
revoke all on function app.aplicar_rescisao() from public;
revoke all on function app.encerrar_estagio() from public;
revoke all on function app.bloquear_alteracao_rescisao() from public;
