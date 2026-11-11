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
   * RF003: an administrator viewing the system as this account. withUser opens a read-only
   * transaction, so nothing done in this view is saved, whatever the screen offers.
   */
  readonly somenteLeitura?: true;
  readonly [identityBrand]: true;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUserId(value: string): boolean {
  return UUID.test(value);
}
