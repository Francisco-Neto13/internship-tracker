import { DomainError } from "@/lib/errors";

// RF002: the administrator issues a temporary password out of band, since the platform
// sends no e-mail (requirements document §10.6). It must be replaced on the next sign-in
// and expires if unused (DISA STIG V-222547; OWASP Cornucopia AT6). 72 hours covers a
// hand-over across a weekend without leaving the credential valid for long.
export const VALIDADE_SENHA_PROVISORIA_HORAS = 72;

export function expiracaoSenhaProvisoria(agora: Date = new Date()): Date {
  return new Date(agora.getTime() + VALIDADE_SENHA_PROVISORIA_HORAS * 60 * 60 * 1000);
}

/** A pending temporary password stops opening sessions, and stops being replaceable, once expired. */
export function senhaProvisoriaExpirada(
  usuario: { trocaSenhaObrigatoria: boolean; senhaProvisoriaExpiraEm: Date | null },
  agora: Date = new Date(),
): boolean {
  return (
    usuario.trocaSenhaObrigatoria &&
    usuario.senhaProvisoriaExpiraEm !== null &&
    usuario.senhaProvisoriaExpiraEm.getTime() <= agora.getTime()
  );
}

/** RF002: the administrator resets other people's passwords; their own goes through the change form. */
export function impedirAutoemissaoSenha(atorId: string, alvoId: string): void {
  if (atorId === alvoId) {
    throw new DomainError({
      code: "AUTOEMISSAO_SENHA_VEDADA",
      kind: "CONFLICT",
      message: "Use a troca de senha para alterar a própria senha.",
      requisito: "RF002",
    });
  }
}
