import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { criarAdministrador, existeAdministrador } from "../../scripts/db/primeiro-admin";
import { closeOwnerDatabase, createUsuario, grantPerfil, owner } from "./fixtures";

// RF001, RF002: the first administrator of an empty production database.

afterAll(closeOwnerDatabase);

describe("primeiro administrador", () => {
  it("creates an account that must change a temporary password within 72 h", async () => {
    const email = `primeiro-${randomUUID()}@teste.local`;
    const senha = await criarAdministrador(owner(), { email, nome: "Primeiro Admin" });

    const [usuario] = await owner().select().from(schema.usuario).where(eq(schema.usuario.email, email));
    expect(usuario.trocaSenhaObrigatoria).toBe(true);
    const horas = (usuario.senhaProvisoriaExpiraEm!.getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(71);
    expect(horas).toBeLessThanOrEqual(72);

    const [conta] = await owner().select().from(schema.conta).where(eq(schema.conta.usuarioId, usuario.id));
    expect(await verifyPassword({ hash: conta.senhaHash!, password: senha })).toBe(true);
    const vinculos = await owner().select().from(schema.vinculoPerfil).where(eq(schema.vinculoPerfil.usuarioId, usuario.id));
    expect(vinculos.map((vinculo) => vinculo.perfil)).toEqual(["ADMINISTRADOR"]);
  });

  it("detects an existing administrator, so the script refuses a second one", async () => {
    const conta = await createUsuario();
    await grantPerfil(conta.id, "ADMINISTRADOR");
    expect(await existeAdministrador(owner())).toBe(true);
  });

  it("leaves nothing behind when the e-mail is already in use", async () => {
    const conta = await createUsuario();
    await expect(criarAdministrador(owner(), { email: conta.email, nome: "Repetido" })).rejects.toThrow();
    const vinculos = await owner().select().from(schema.vinculoPerfil).where(eq(schema.vinculoPerfil.usuarioId, conta.id));
    expect(vinculos).toEqual([]);
  });
});
