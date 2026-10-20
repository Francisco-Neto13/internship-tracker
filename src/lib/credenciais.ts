import { getAuth } from "./auth";

// Credential and session writes for RF001/RF002. They run on the auth pool through the
// library's internal adapter, because app_runtime holds no grant on conta or sessao
// (password hashes and session tokens). Hashing goes through the password hasher the
// library is configured with, so issued passwords verify at sign-in like any other.

/**
 * Sets the e-mail/password credential of a user, creating it when the account has none
 * (an account created by the administrator, or one whose first credential write failed).
 * The library identifies that credential by providerId "credential" and accountId = userId.
 */
export async function definirSenha(usuarioId: string, senha: string): Promise<void> {
  const context = await getAuth().$context;
  const senhaHash = await context.password.hash(senha);
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

/** Ends every open session of the user (RF001 inactivation, RF002 password reset). */
export async function revogarSessoes(usuarioId: string): Promise<void> {
  const context = await getAuth().$context;
  await context.internalAdapter.deleteUserSessions(usuarioId);
}
