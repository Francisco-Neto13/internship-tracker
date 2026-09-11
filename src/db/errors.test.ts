import { describe, expect, it } from "vitest";
import { isForeignKeyViolation, isRlsViolation, isUniqueViolation } from "./errors";

function wrapped(cause: object) {
  return Object.assign(new Error("Failed query"), { cause });
}

describe("database error classification", () => {
  it("finds the driver error behind the ORM wrapper", () => {
    const error = wrapped({ code: "23505", constraint: "estudante_matricula_unique", message: "duplicate key" });

    expect(isUniqueViolation(error, "estudante_matricula_unique")).toBe(true);
    expect(isUniqueViolation(error, "outra_constraint")).toBe(false);
  });

  it("tells an RLS rejection apart from a missing grant", () => {
    const rls = wrapped({ code: "42501", message: 'new row violates row-level security policy for table "estudante"' });
    const grant = wrapped({ code: "42501", message: "permission denied for table sessao" });

    expect(isRlsViolation(rls)).toBe(true);
    expect(isRlsViolation(grant)).toBe(false);
  });

  it("matches foreign key violations by constraint", () => {
    const error = wrapped({ code: "23503", constraint: "estudante_curso_id_curso_id_fk", message: "violates foreign key" });

    expect(isForeignKeyViolation(error, "estudante_curso_id_curso_id_fk")).toBe(true);
  });

  it("ignores errors that did not come from the database", () => {
    expect(isRlsViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(undefined, "x")).toBe(false);
  });
});
