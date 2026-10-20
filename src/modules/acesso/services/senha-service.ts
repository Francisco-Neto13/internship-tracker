import { withUser } from "@/db/with-user";
import { alterarSenhaPropria } from "@/lib/credenciais";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { senhaProvisoriaExpirada } from "../domain/senha-provisoria";
import { concluirTrocaSenha } from "../repositories/usuario-repository";

/**
 * RF002: the user replaces their password, forced on first access with a temporary one or
 * voluntary afterwards. An expired temporary password cannot be replaced: the session was
 * opened before the expiry, and the administrator has to issue a new one.
 *
 * The credential changes first (auth pool); the pending flag is cleared after, under the
 * user's identity so the audit trail records them (RN-28). If clearing fails, the user
 * signs in with the new password and is asked to change it once more: safe, never stuck.
 */
export async function trocarSenha(
  identity: Identity,
  usuario: { trocaSenhaObrigatoria: boolean; senhaProvisoriaExpiraEm: Date | null },
  requestHeaders: Headers,
  input: { senhaAtual: string; novaSenha: string },
): Promise<void> {
  if (senhaProvisoriaExpirada(usuario)) {
    throw new DomainError({
      code: "SENHA_PROVISORIA_EXPIRADA",
      kind: "FORBIDDEN",
      message: "A senha provisória expirou. Solicite uma nova ao administrador.",
      requisito: "RF002",
    });
  }

  await alterarSenhaPropria(requestHeaders, input.senhaAtual, input.novaSenha);

  if (usuario.trocaSenhaObrigatoria) {
    await withUser(identity, (tx) => concluirTrocaSenha(tx));
  }
}
