-- Reverts 0017_contexto_administrador (RF003). Removes the record of the switches; their
-- trail in auditoria stays.
drop table if exists public.contexto_administrador;
drop function if exists app.validar_contexto_administrador();
