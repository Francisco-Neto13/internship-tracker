-- Reverts 0009_leitura_sensivel (RF072). The audit trail is append-only, so once a LEITURA row
-- exists the narrow check cannot come back without deleting evidence: in that case the
-- wider check stays and the script only warns.
do $$
begin
  if exists (select 1 from public.auditoria where operacao = 'LEITURA') then
    raise notice 'auditoria has LEITURA rows; auditoria_operacao_valida keeps LEITURA';
  else
    alter table public.auditoria drop constraint auditoria_operacao_valida;
    alter table public.auditoria add constraint auditoria_operacao_valida check (operacao in ('INSERT', 'UPDATE', 'DELETE'));
  end if;
end
$$;
drop function if exists app.acessos_documento(uuid);
drop function if exists app.pode_consultar_acessos_documento(uuid);
drop function if exists app.registrar_leitura_documento(uuid);
