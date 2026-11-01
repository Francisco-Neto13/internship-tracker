import { APIError } from "better-auth/api";
import { getAuth } from "./auth";
import { DomainError } from "./errors";
import { hashPassword } from "./password";

// Credential and session writes for RF001/RF002. They run on the auth pool through the
// library's internal adapter, because app_runtime holds no grant on conta or sessao
// (password hashes and session tokens).

/**
 * Sets the e-mail/password credential of a user, creating it when the account has none
 * (an account created by the administrator, or one whose first credential write failed).
 * The library identifies that credential by providerId "credential" and accountId = userId.
 *
 * Only for generated temporary passwords (RF002). It hashes with hashPassword, the same
 * hasher src/lib/auth.ts configures, and not with context.password.hash: plugins wrap that
 * one (haveIBeenPwned) and require a library endpoint context, which this call lacks. A
 * random 16-character password needs no breach lookup.
 */
export async function definirSenha(usuarioId: string, senha: string): Promise<void> {
  const context = await getAuth().$context;
  const senhaHash = await hashPassword(senha);
  const existente = await context.internalAdapter.findCredentialAccount(usuarioId);

  if (existente) {
    await context.internalAdapter.updatePassword(usuarioId, senhaHash);
    return;
  }

  await context.internalAdapter.linkAccount({
    userId: usuarioId,
    providerId: "credential",
    accountId: usuarioId,
    password: senhaHash,
  });
}

/**
 * RF002: the signed-in user replaces their own password. The library checks the current
 * password and the length bounds, ends every other session and reissues the session
 * cookie for this one (set through the nextCookies plugin).
 */
export async function alterarSenhaPropria(requestHeaders: Headers, senhaAtual: string, novaSenha: string): Promise<void> {
  try {
    await getAuth().api.changePassword({
      headers: requestHeaders,
      body: { currentPassword: senhaAtual, newPassword: novaSenha, revokeOtherSessions: true },
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      throw new DomainError({
        code: "SENHA_ATUAL_INCORRETA",
        kind: "UNPROCESSABLE",
        message: "A senha atual não confere.",
        requisito: "RF002",
      });
    }
    // haveIBeenPwned plugin (src/lib/auth.ts): the password is in a breach corpus
    if (error instanceof APIError && error.body?.code === "PASSWORD_COMPROMISED") {
      throw new DomainError({
        code: "SENHA_VAZADA",
        kind: "UNPROCESSABLE",
        message: "Esta senha aparece em vazamentos de dados conhecidos. Escolha outra.",
        requisito: "RF002",
      });
    }
    // The lookup itself failed: refuse instead of accepting an unchecked password
    if (error instanceof APIError && error.message.startsWith("Failed to check password")) {
      throw new DomainError({
        code: "VERIFICACAO_SENHA_INDISPONIVEL",
        kind: "UNAVAILABLE",
        message: "Não foi possível verificar a senha agora. Tente de novo em alguns minutos.",
        requisito: "RF002",
      });
    }
    throw error;
  }
}

/** Ends every open session of the user (RF001 inactivation, RF002 password reset). */
export async function revogarSessoes(usuarioId: string): Promise<void> {
  const context = await getAuth().$context;
  await context.internalAdapter.deleteUserSessions(usuarioId);
}
