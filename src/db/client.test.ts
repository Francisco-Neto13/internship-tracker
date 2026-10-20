import { afterEach, describe, expect, it } from "vitest";
import { closeDatabases, getAppDatabase, getAuthDatabase } from "./client";

const original = { app: process.env.DATABASE_URL, auth: process.env.DATABASE_AUTH_URL };

afterEach(async () => {
  process.env.DATABASE_URL = original.app;
  process.env.DATABASE_AUTH_URL = original.auth;
  await closeDatabases();
});

// A Pool only connects on the first query, so these run without a database
describe("connection pools refuse a role that bypasses RLS (RF003, RNF-01)", () => {
  it("rejects the table owner on the app pool", () => {
    process.env.DATABASE_URL = "postgres://migrator:segredo@localhost:5432/internship_tracker";

    expect(() => getAppDatabase()).toThrow(/must connect as app_runtime, not "migrator"/);
  });

  it("never echoes the password in the error", () => {
    process.env.DATABASE_URL = "postgres://neondb_owner:senha-secreta@host/neondb";

    const error = (() => {
      try {
        getAppDatabase();
      } catch (caught) {
        return caught as Error;
      }
    })();
    expect(error?.message).toContain("neondb_owner");
    expect(error?.message).not.toContain("senha-secreta");
  });

  it("rejects a URL without a user, which pg would resolve to the OS account", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/internship_tracker";

    expect(() => getAppDatabase()).toThrow(/must connect as app_runtime, not ""/);
  });

  it("does not accept the app role on the auth pool", () => {
    process.env.DATABASE_AUTH_URL = "postgres://app_runtime:x@localhost:5432/internship_tracker";

    expect(() => getAuthDatabase()).toThrow(/must connect as auth_runtime/);
  });

  it("accepts each pool's own runtime role", () => {
    process.env.DATABASE_URL = "postgres://app_runtime:x@localhost:5432/internship_tracker";
    process.env.DATABASE_AUTH_URL = "postgres://auth_runtime:x@localhost:5432/internship_tracker";

    expect(() => getAppDatabase()).not.toThrow();
    expect(() => getAuthDatabase()).not.toThrow();
  });
});
