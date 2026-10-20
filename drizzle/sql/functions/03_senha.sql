-- RF002: a user who replaced the temporary password closes their own pending change.
-- SECURITY DEFINER because app_runtime holds no UPDATE policy on its own usuario row: a
-- self-update grant would also let users rewrite nome and situacao. The function touches
-- only the caller's row and only the two columns of the pending change. The audit trigger
-- still records the caller, read from app.usuario_id like every other write (RN-28).
create or replace function app.concluir_troca_senha()
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  update public.usuario
     set troca_senha_obrigatoria = false,
         senha_provisoria_expira_em = null
   where id = app.usuario_atual_id()
     and troca_senha_obrigatoria
  returning true
$$;

revoke all on function app.concluir_troca_senha() from public;
grant execute on function app.concluir_troca_senha() to app_runtime;
