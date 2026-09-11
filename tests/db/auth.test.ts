import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { conta, sessao, usuario } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { resolveSession } from "@/lib/session";
import { createUsuario, owner } from "./fixtures";

const SENHA = "senha-de-teste-segura";

async function signIn(email: string, password: string) {
  const { headers } = await getAuth().api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

describe("authentication (RF001, RF002)", () => {
  it("stores passwords as Argon2id hashes", async () => {
    const user = await createUsuario({ senha: SENHA });
    const [account] = await owner().select().from(conta).where(eq(conta.usuarioId, user.id));

    expect(account.senhaHash).toMatch(/^\$argon2id\$/);
  });

  it("signs in with e-mail and password and resolves the identity from the cookie", async () => {
    const user = await createUsuario({ senha: SENHA });

    const resolved = await resolveSession(await signIn(user.email, SENHA));

    expect(resolved?.identity.userId).toBe(user.id);
    expect(resolved?.user).toMatchObject({ nome: user.nome, email: user.email });
  });

  it("rejects a wrong password", async () => {
    const user = await createUsuario({ senha: SENHA });

    await expect(signIn(user.email, "senha-errada-mesmo")).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it("does not open a session for an inactive user", async () => {
    const user = await createUsuario({ senha: SENHA, situacao: "INATIVO" });

    await expect(signIn(user.email, SENHA)).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect(await owner().select().from(sessao).where(eq(sessao.usuarioId, user.id))).toEqual([]);
  });

  it("stops resolving the session as soon as the user is inactivated", async () => {
    const user = await createUsuario({ senha: SENHA });
    const cookie = await signIn(user.email, SENHA);

    await owner().update(usuario).set({ situacao: "INATIVO" }).where(eq(usuario.id, user.id));

    expect(await resolveSession(cookie)).toBeNull();
  });

  it("does not allow self sign-up", async () => {
    await expect(
      getAuth().api.signUpEmail({ body: { name: "Intruso", email: "intruso@teste.local", password: SENHA } }),
    ).rejects.toThrow();
  });

  it("expires sessions after 30 minutes", async () => {
    const user = await createUsuario({ senha: SENHA });
    await signIn(user.email, SENHA);

    const [row] = await owner().select().from(sessao).where(eq(sessao.usuarioId, user.id));
    const lifetimeMinutes = (row.expiraEm.getTime() - row.criadoEm.getTime()) / 60_000;

    expect(lifetimeMinutes).toBeGreaterThan(29);
    expect(lifetimeMinutes).toBeLessThanOrEqual(30.1);
  });

  it("ends the session on sign-out", async () => {
    const user = await createUsuario({ senha: SENHA });
    const cookie = await signIn(user.email, SENHA);

    await getAuth().api.signOut({ headers: cookie });

    expect(await resolveSession(cookie)).toBeNull();
  });
});
