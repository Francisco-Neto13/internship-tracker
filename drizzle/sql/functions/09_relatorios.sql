-- M05 Relatórios (RF036 to RF041, RN-13, RN-14, RN-17; DER-LOGICO §4.5, §5.8)
-- Reports are generated when the internship becomes ATIVO and their situation moves only
-- through a version (the student sends) or an opinion (the advisor decides), both by
-- trigger: no route updates a report directly.

-- RF036: periodicity of the course and internship type, or the default when none was set:
-- every 6 months (Lei 11.788/2008, art. 7º, IV: "prazo não superior a 6 meses"), 15 days to
-- send each report and 30 days after the end for the final one. Mirrors PERIODICIDADE_PADRAO
-- in src/modules/academico/domain/periodicidade.ts (tested).
create or replace function app.periodicidade_de(p_curso_id uuid, p_tipo public.tipo_estagio)
returns table (intervalo_meses integer, prazo_entrega_dias integer, prazo_relatorio_final_dias integer)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.intervalo_meses, 6)::integer,
         coalesce(p.prazo_entrega_dias, 15)::integer,
         coalesce(p.prazo_relatorio_final_dias, 30)::integer
  from (select 1) as padrao
  left join public.periodicidade_relatorio p on p.curso_id = p_curso_id and p.tipo_estagio = p_tipo
$$;

-- DER §5.8: consecutive periods of intervalo_meses from data_inicio to data_fim_prevista, each
-- due prazo_entrega_dias after its end, plus the final report (mandatory internship only,
-- RN-17). Idempotent: creates what is missing and moves only reports still PENDENTE (a later
-- end date extends the last period and adds new ones); sent, analyzed or approved reports
-- never change. Returns how many rows it created or moved.
create or replace function app.gerar_relatorios(p_estagio_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio record;
  v_periodicidade record;
  v_existente record;
  v_sequencia integer := 1;
  v_inicio date;
  v_fim date;
  v_prazo date;
  v_alterados integer := 0;
begin
  select g.id, g.situacao, g.tipo, g.curso_id, g.data_inicio, g.data_fim_prevista into v_estagio
    from public.estagio g where g.id = p_estagio_id;
  if v_estagio.situacao is distinct from 'ATIVO' then
    return 0;
  end if;
  select * into v_periodicidade from app.periodicidade_de(v_estagio.curso_id, v_estagio.tipo);

  loop
    v_inicio := (v_estagio.data_inicio + make_interval(months => (v_sequencia - 1) * v_periodicidade.intervalo_meses))::date;
    exit when v_inicio > v_estagio.data_fim_prevista;
    v_fim := least(
      (v_estagio.data_inicio + make_interval(months => v_sequencia * v_periodicidade.intervalo_meses))::date - 1,
      v_estagio.data_fim_prevista
    );
    v_prazo := v_fim + v_periodicidade.prazo_entrega_dias;

    select r.id, r.situacao, r.periodo_inicio, r.periodo_fim, r.prazo_entrega into v_existente
      from public.relatorio r where r.estagio_id = p_estagio_id and r.tipo = 'PERIODICO' and r.sequencia = v_sequencia;
    if not found then
      insert into public.relatorio (estagio_id, tipo, sequencia, periodo_inicio, periodo_fim, prazo_entrega)
      values (p_estagio_id, 'PERIODICO', v_sequencia, v_inicio, v_fim, v_prazo);
      v_alterados := v_alterados + 1;
    elsif v_existente.situacao = 'PENDENTE'
      and (v_existente.periodo_inicio, v_existente.periodo_fim, v_existente.prazo_entrega) is distinct from (v_inicio, v_fim, v_prazo) then
      update public.relatorio set periodo_inicio = v_inicio, periodo_fim = v_fim, prazo_entrega = v_prazo where id = v_existente.id;
      v_alterados := v_alterados + 1;
    end if;
    v_sequencia := v_sequencia + 1;
  end loop;

  if v_estagio.tipo = 'OBRIGATORIO' then
    v_prazo := v_estagio.data_fim_prevista + v_periodicidade.prazo_relatorio_final_dias;
    select r.id, r.situacao, r.periodo_fim, r.prazo_entrega into v_existente
      from public.relatorio r where r.estagio_id = p_estagio_id and r.tipo = 'FINAL';
    if not found then
      insert into public.relatorio (estagio_id, tipo, sequencia, periodo_inicio, periodo_fim, prazo_entrega)
      values (p_estagio_id, 'FINAL', 1, v_estagio.data_inicio, v_estagio.data_fim_prevista, v_prazo);
      v_alterados := v_alterados + 1;
    elsif v_existente.situacao = 'PENDENTE'
      and (v_existente.periodo_fim, v_existente.prazo_entrega) is distinct from (v_estagio.data_fim_prevista, v_prazo) then
      update public.relatorio set periodo_fim = v_estagio.data_fim_prevista, prazo_entrega = v_prazo where id = v_existente.id;
      v_alterados := v_alterados + 1;
    end if;
  end if;
  return v_alterados;
end
$$;

-- Fired on estagio: activation generates the reports; a new planned end (amendment, leave)
-- moves the pending ones (DER §5.8)
create or replace function app.gerar_relatorios_do_estagio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'ATIVO' and (old.situacao <> 'ATIVO' or new.data_fim_prevista <> old.data_fim_prevista) then
    perform app.gerar_relatorios(new.id);
  end if;
  return null;
end
$$;

-- Who follows the reports (DER §4.5): the student, the advisor in force and the coordination.
-- Supervisor, concedente and administrator do not read them.
create or replace function app.pode_ler_relatorios(p_estagio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.e_estudante_do_estagio(p_estagio_id)
      or app.e_responsavel_vigente(p_estagio_id, 'ORIENTADOR')
      or app.coordena_curso_do_estagio(p_estagio_id)
$$;

create or replace function app.estagio_do_relatorio(p_relatorio_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.estagio_id from public.relatorio r where r.id = p_relatorio_id
$$;

create or replace function app.estagio_da_versao(p_versao_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.estagio_id
  from public.versao_relatorio v
  join public.relatorio r on r.id = v.relatorio_id
  where v.id = p_versao_id
$$;

-- relatorio: periods move only while PENDENTE (generation); the situation follows the flow
create or replace function app.validar_alteracao_relatorio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estagio_id <> old.estagio_id or new.tipo <> old.tipo or new.sequencia <> old.sequencia then
    raise exception 'REGISTRO_IMUTAVEL: estágio, tipo e sequência do relatório não mudam' using errcode = 'P0001';
  end if;
  if (new.periodo_inicio, new.periodo_fim, new.prazo_entrega) is distinct from (old.periodo_inicio, old.periodo_fim, old.prazo_entrega)
     and old.situacao <> 'PENDENTE' then
    raise exception 'REGISTRO_IMUTAVEL: período e prazo só mudam enquanto o relatório está pendente' using errcode = 'P0001';
  end if;
  if new.situacao <> old.situacao and not (
    (old.situacao in ('PENDENTE', 'DEVOLVIDO') and new.situacao = 'EM_ANALISE')
    or (old.situacao = 'EM_ANALISE' and new.situacao in ('APROVADO', 'DEVOLVIDO'))
  ) then
    raise exception 'TRANSICAO_RELATORIO_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF037, RF039, RF041: the student sends a report that is pending or returned, of an ATIVO
-- internship. Late sending is accepted (RF037, §9.1 P9): "em atraso" is derived. A periodic
-- report is not sent before its period starts. The number of the version is assigned here.
create or replace function app.validar_versao_relatorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relatorio record;
  v_usuario uuid := app.usuario_atual_id();
begin
  select r.id, r.tipo, r.situacao, r.periodo_inicio, r.estagio_id, g.situacao as situacao_estagio into v_relatorio
    from public.relatorio r join public.estagio g on g.id = r.estagio_id
   where r.id = new.relatorio_id
     for update of r;
  if v_relatorio.situacao_estagio is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: relatórios são enviados com o estágio ativo' using errcode = 'P0001';
  end if;
  if v_relatorio.situacao not in ('PENDENTE', 'DEVOLVIDO') then
    raise exception 'RELATORIO_NAO_ENVIAVEL: o relatório está %', v_relatorio.situacao using errcode = 'P0001';
  end if;
  if v_relatorio.tipo = 'PERIODICO' and v_relatorio.periodo_inicio > app.hoje() then
    raise exception 'RELATORIO_ANTECIPADO: o período do relatório ainda não começou' using errcode = 'P0001';
  end if;
  if v_usuario is not null and (new.enviado_por_usuario_id is distinct from v_usuario or not app.e_estudante_do_estagio(v_relatorio.estagio_id)) then
    raise exception 'ENVIO_RESTRITO_AO_ESTUDANTE: só o estudante envia o próprio relatório' using errcode = 'P0001';
  end if;
  new.conteudo := nullif(btrim(new.conteudo), '');
  select coalesce(max(v.numero), 0) + 1 into new.numero from public.versao_relatorio v where v.relatorio_id = new.relatorio_id;
  return new;
end
$$;

create or replace function app.relatorio_enviado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.relatorio set situacao = 'EM_ANALISE' where id = new.relatorio_id;
  return null;
end
$$;

-- DER §5.8, checked at commit: a version has text or at least one attachment
create or replace function app.exigir_conteudo_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.conteudo is null and not exists (select 1 from public.anexo_relatorio a where a.versao_relatorio_id = new.id) then
    raise exception 'RELATORIO_VAZIO: o relatório precisa de texto ou de ao menos um anexo' using errcode = 'P0001';
  end if;
  return null;
end
$$;

-- RF037: attachments belong to the sending in which they were made (same transaction), are
-- report documents of the same internship, and are added by whoever sent the version
create or replace function app.validar_anexo_relatorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao record;
begin
  select v.id, v.criado_em, v.enviado_por_usuario_id, r.estagio_id,
         v.numero = (select max(o.numero) from public.versao_relatorio o where o.relatorio_id = v.relatorio_id) as mais_recente
    into v_versao
    from public.versao_relatorio v join public.relatorio r on r.id = v.relatorio_id
   where v.id = new.versao_relatorio_id;
  if not v_versao.mais_recente or v_versao.criado_em <> now() then
    raise exception 'ANEXO_FORA_DO_ENVIO: anexos entram junto com o envio da versão' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null and v_versao.enviado_por_usuario_id is distinct from app.usuario_atual_id() then
    raise exception 'ENVIO_RESTRITO_AO_ESTUDANTE: só quem envia a versão anexa arquivos' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.documento d
    where d.id = new.documento_id and d.tipo = 'RELATORIO' and d.estagio_id = v_versao.estagio_id
  ) then
    raise exception 'DOCUMENTO_INVALIDO: o anexo precisa ser documento de relatório deste estágio' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF038, RF039, RN-14: the advisor in force decides the latest version of a report in analysis
create or replace function app.validar_parecer_relatorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao record;
  v_usuario uuid := app.usuario_atual_id();
begin
  select v.id, r.id as relatorio_id, r.situacao, r.estagio_id, g.situacao as situacao_estagio,
         v.numero = (select max(o.numero) from public.versao_relatorio o where o.relatorio_id = v.relatorio_id) as mais_recente
    into v_versao
    from public.versao_relatorio v
    join public.relatorio r on r.id = v.relatorio_id
    join public.estagio g on g.id = r.estagio_id
   where v.id = new.versao_relatorio_id
     for update of r;
  if v_versao.situacao_estagio is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: relatórios são analisados com o estágio ativo' using errcode = 'P0001';
  end if;
  if v_versao.situacao <> 'EM_ANALISE' or not v_versao.mais_recente then
    raise exception 'RELATORIO_NAO_ANALISAVEL: só a versão mais recente de relatório em análise recebe parecer' using errcode = 'P0001';
  end if;
  if v_usuario is not null and (new.emitido_por_usuario_id is distinct from v_usuario
     or not app.e_responsavel_vigente(v_versao.estagio_id, 'ORIENTADOR')) then
    raise exception 'ANALISE_RESTRITA_AO_ORIENTADOR: só o professor orientador analisa o relatório' using errcode = 'P0001';
  end if;
  new.texto := nullif(btrim(new.texto), '');
  return new;
end
$$;

create or replace function app.aplicar_parecer_relatorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.relatorio r
     set situacao = new.decisao::text::public.situacao_relatorio,
         aprovado_em = case when new.decisao = 'APROVADO' then now() end
   where r.id = (select v.relatorio_id from public.versao_relatorio v where v.id = new.versao_relatorio_id);
  return null;
end
$$;

revoke all on function app.periodicidade_de(uuid, public.tipo_estagio) from public;
revoke all on function app.gerar_relatorios(uuid) from public;
revoke all on function app.gerar_relatorios_do_estagio() from public;
revoke all on function app.pode_ler_relatorios(uuid) from public;
revoke all on function app.estagio_do_relatorio(uuid) from public;
revoke all on function app.estagio_da_versao(uuid) from public;
revoke all on function app.validar_alteracao_relatorio() from public;
revoke all on function app.validar_versao_relatorio() from public;
revoke all on function app.relatorio_enviado() from public;
revoke all on function app.exigir_conteudo_versao() from public;
revoke all on function app.validar_anexo_relatorio() from public;
revoke all on function app.validar_parecer_relatorio() from public;
revoke all on function app.aplicar_parecer_relatorio() from public;

grant execute on function app.periodicidade_de(uuid, public.tipo_estagio) to app_runtime;
grant execute on function app.pode_ler_relatorios(uuid) to app_runtime;
grant execute on function app.estagio_do_relatorio(uuid) to app_runtime;
grant execute on function app.estagio_da_versao(uuid) to app_runtime;
