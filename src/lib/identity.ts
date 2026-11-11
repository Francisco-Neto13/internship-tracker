declare const identityBrand: unique symbol;

/**
 * Authenticated user on whose behalf the database is queried (RN-28, RN-37).
 *
 * The brand makes an Identity impossible to build from a plain string: the only
 * producer is getIdentity() in src/lib/session.ts, which reads the session cookie.
 * Casting to Identity outside that file and tests defeats the protection.
 */
export type Identity = {
  readonly userId: string;
  /**
   * RF003: set while an administrator acts as this account through the profile switch; holds
   * the administrator's own id. withUser hands it to the database, so the audit trail records
   * who acted, and report content and documents stay out of reach.
   */
  readonly titularId?: string;
  readonly [identityBrand]: true;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUserId(value: string): boolean {
  return UUID.test(value);
}
