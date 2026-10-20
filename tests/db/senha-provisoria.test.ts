import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { auditoria, sessao, usuario } from "@/db/schema";
import { withUser } from "@/db/with-user";
import { resolveSession } from "@/lib/session";
import { trocarSenha } from "@/modules/acesso/services/senha-service";
import { createUsuario as criarUsuario, emitirSenhaProvisoria } from "@/modules/acesso/services/usuario-service";
import { createAccessScenario, createUsuario, identityOf, owner, signIn } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const NOVA_SENHA = "uma frase longa e minha";

async function novoUsuarioComSenhaProvisoria(administradorId: string) {
  const { usuario: criado, senhaProvisoria } = await criarUsuario(identityOf(administradorId), {
    nome: "Primeiro Acesso",
    email: `primeiro-${randomUUID().slice(0, 8)}@teste.local`,
    perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
  });
  return { criado, senhaProvisoria };
}

async function sessaoDe(email: string, senha: string) {
  const cookie = await signIn(email, senha);
  const resolved = await resolveSession(cookie);
  return { cookie, resolved: resolved! };
}

async function expirar(usuarioId: string) {
  await owner()
    .update(usuario)
    .set({ senhaProvisoriaExpiraEm: new Date(Date.now() - 60_000) })
    .where(eq(usuario.id, usuarioId));
}

describe("first access with a temporary password (RF002)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("signs in and flags the session as requiring a password change", async () => {
    const { criado, senhaProvisoria } = await novoUsuarioComSenhaProvisoria(s.administrador.id);

    const { resolved } = await sessaoDe(criado.email, senhaProvisoria);

    expect(resolved.user.trocaSenhaObrigatoria).toBe(true);
    expect(resolved.user.senhaProvisoriaExpiraEm).toBeInstanceOf(Date);
  });

  it("refuses to open a session with an expired temporary password", async () => {
    const { criado, senhaProvisoria } = await novoUsuarioComSenhaProvisoria(s.administrador.id);
    await expirar(criado.id);

    await expect(signIn(criado.email, senhaProvisoria)).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: expect.objectContaining({ code: "SENHA_PROVISORIA_EXPIRADA" }),
    });
    expect(await owner().select().from(sessao).where(eq(sessao.usuarioId, criado.id))).toEqual([]);
  });

  it("replaces the password, clears the flag and records the user as author", async () => {
    const { criado, senhaProvisoria } = await novoUsuarioComSenhaProvisoria(s.administrador.id);
    const { cookie, resolved } = await sessaoDe(criado.email, senhaProvisoria);

    await trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: NOVA_SENHA });

    const [row] = await owner().select().from(usuario).where(eq(usuario.id, criado.id));
    expect(row).toMatchObject({ trocaSenhaObrigatoria: false, senhaProvisoriaExpiraEm: null });

    const [registro] = await owner()
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.tabela, "usuario"), eq(auditoria.registroId, criado.id)))
      .orderBy(desc(auditoria.id))
      .limit(1);
    expect(registro).toMatchObject({ operacao: "UPDATE", usuarioId: criado.id });

    // the old session was replaced, the temporary password no longer works, the new one does
    expect(await resolveSession(cookie)).toBeNull();
    await expect(signIn(criado.email, senhaProvisoria)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    const depois = await sessaoDe(criado.email, NOVA_SENHA);
    expect(depois.resolved.user.trocaSenhaObrigatoria).toBe(false);
  });

  it("rejects a wrong current password without touching the flag", async () => {
    const { criado, senhaProvisoria } = await novoUsuarioComSenhaProvisoria(s.administrador.id);
    const { cookie, resolved } = await sessaoDe(criado.email, senhaProvisoria);

    await expect(
      trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: "nao-e-a-senha-certa", novaSenha: NOVA_SENHA }),
    ).rejects.toMatchObject({ code: "SENHA_ATUAL_INCORRETA", kind: "UNPROCESSABLE" });

    const [row] = await owner().select().from(usuario).where(eq(usuario.id, criado.id));
    expect(row.trocaSenhaObrigatoria).toBe(true);
  });

  it("refuses to replace a temporary password that expired during the session", async () => {
    const { criado, senhaProvisoria } = await novoUsuarioComSenhaProvisoria(s.administrador.id);
    const { cookie } = await sessaoDe(criado.email, senhaProvisoria);
    await expirar(criado.id);
    const resolved = (await resolveSession(cookie))!;

    await expect(
      trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: NOVA_SENHA }),
    ).rejects.toMatchObject({ code: "SENHA_PROVISORIA_EXPIRADA", kind: "FORBIDDEN" });
  });

  it("lets a user clear only their own pending flag", async () => {
    const { criado } = await novoUsuarioComSenhaProvisoria(s.administrador.id);
    const outro = await createUsuario();

    const concluida = await withUser(identityOf(outro.id), async (tx) => {
      const { rows } = await tx.execute<{ concluida: boolean | null }>(sql`select app.concluir_troca_senha() as concluida`);
      return rows[0].concluida;
    });

    expect(concluida).toBeNull();
    const [row] = await owner().select().from(usuario).where(eq(usuario.id, criado.id));
    expect(row.trocaSenhaObrigatoria).toBe(true);
  });
});

describe("temporary password issued by the administrator (RF002)", () => {
  let s: Scenario;
  const SENHA = "senha-antiga-de-teste";

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("replaces the password, ends every session and requires a change", async () => {
    const pessoa = await createUsuario({ senha: SENHA });
    const { cookie } = await sessaoDe(pessoa.email, SENHA);

    const { usuario: atualizado, senhaProvisoria } = await emitirSenhaProvisoria(identityOf(s.administrador.id), pessoa.id);

    expect(atualizado.trocaSenhaObrigatoria).toBe(true);
    expect(await resolveSession(cookie)).toBeNull();
    await expect(signIn(pessoa.email, SENHA)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await sessaoDe(pessoa.email, senhaProvisoria)).resolved.user.trocaSenhaObrigatoria).toBe(true);
  });

  it("refuses issuance by anyone who is not an administrator and keeps the password", async () => {
    const pessoa = await createUsuario({ senha: SENHA });

    // hidden by RLS: 404; visible to coordination (a student of its course) but not writable: 403
    await expect(emitirSenhaProvisoria(identityOf(s.semPerfil.id), pessoa.id)).rejects.toMatchObject({
      code: "USUARIO_NAO_ENCONTRADO",
    });
    await expect(emitirSenhaProvisoria(identityOf(s.coordenadorA.id), s.alunoA.id)).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });

    expect((await sessaoDe(pessoa.email, SENHA)).resolved.identity.userId).toBe(pessoa.id);
  });

  it("forbids the administrator from resetting their own password this way", async () => {
    await expect(emitirSenhaProvisoria(identityOf(s.administrador.id), s.administrador.id)).rejects.toMatchObject({
      code: "AUTOEMISSAO_SENHA_VEDADA",
    });
  });
});
