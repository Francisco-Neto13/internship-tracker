// Postgres error classification for repositories. Drizzle wraps driver errors, so the
// original DatabaseError is searched along the cause chain.

type PgError = { code: string; constraint?: string; message: string };

function findPgError(error: unknown): PgError | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as Partial<PgError> & { cause?: unknown };
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return candidate as PgError;
    }
    current = candidate.cause;
  }
  return undefined;
}

/** A write rejected by a WITH CHECK clause: the identity may not create or move this row. */
export function isRlsViolation(error: unknown): boolean {
  const pg = findPgError(error);
  return pg?.code === "42501" && pg.message.includes("row-level security");
}

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const pg = findPgError(error);
  return pg?.code === "23505" && pg.constraint === constraint;
}

export function isForeignKeyViolation(error: unknown, constraint: string): boolean {
  const pg = findPgError(error);
  return pg?.code === "23503" && pg.constraint === constraint;
}
