-- ATIVO -> CONCLUIDO guards (DER-LOGICO §5.2; RF041, RF043, RF045, RN-17, D3). Calculated in
-- the database so the conclusion of Fase 5 only consumes them: app.validar_alteracao_estagio
-- refuses the transition while this list is not empty, whatever path tries it.
--   CARGA_MINIMA_NAO_CUMPRIDA  mandatory: homologated minutes below the course minimum (RF045)
--   RELATORIO_FINAL_PENDENTE   mandatory: final report not approved (RF041, RF045)
--   AVALIACAO_PENDENTE         final evaluation not recorded (RF043)
--   FREQUENCIA_NAO_HOMOLOGADA  an entry in force still waits for homologation (D3)
create or replace function app.impedimentos_conclusao(p_estagio_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with estagio as (
    select g.id, g.tipo, c.carga_minima_estagio_minutos
    from public.estagio g
    join public.curso c on c.id = g.curso_id
    where g.id = p_estagio_id
      and (app.usuario_atual_id() is null or app.pode_ler_estagio(g.id))
  )
  select array_remove(array[
    case when e.tipo = 'OBRIGATORIO' and coalesce((
      select sum(r.duracao_minutos) from public.registro_frequencia r where r.estagio_id = e.id and r.situacao = 'HOMOLOGADO'
    ), 0) < e.carga_minima_estagio_minutos then 'CARGA_MINIMA_NAO_CUMPRIDA' end,
    case when e.tipo = 'OBRIGATORIO' and not exists (
      select 1 from public.relatorio r where r.estagio_id = e.id and r.tipo = 'FINAL' and r.situacao = 'APROVADO'
    ) then 'RELATORIO_FINAL_PENDENTE' end,
    case when not exists (
      select 1 from public.avaliacao_desempenho a where a.estagio_id = e.id and a.momento = 'FINAL'
    ) then 'AVALIACAO_PENDENTE' end,
    case when exists (
      select 1 from public.registro_frequencia r where r.estagio_id = e.id and r.situacao in ('REGISTRADO', 'SINALIZADO')
    ) then 'FREQUENCIA_NAO_HOMOLOGADA' end
  ], null)
  from estagio e
$$;

revoke all on function app.impedimentos_conclusao(uuid) from public;
grant execute on function app.impedimentos_conclusao(uuid) to app_runtime;
