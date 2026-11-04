import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { solicitarRecuperacaoSenha } from "@/db/rotinas";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { closeOwnerDatabase, createUsuario, grantPerfil, owner } from "./fixtures";
import { como } from "./estagio-helpers";

// RF002: "esqueceu a senha" without e-mail. The request warns the administrators, reveals nothing
// to whoever asks and cannot be used to flood them.

afterAll(closeOwnerDatabase);

async function avisosSobre(usuarioId: string) {
  return owner()
    .select()
    .from(schema.notificacao)
    .where(and(eq(schema.notificacao.tipo, "RECUPERACAO_SENHA"), eq(schema.notificacao.entidadeId, usuarioId)));
}

async function administrador() {
  const pessoa = await createUsuario();
  await grantPerfil(pessoa.id, "ADMINISTRADOR");
  return pessoa;
}

describe("pedido de senha provisória (RF002)", () => {
  it("warns the active administrators, pointing to the account", async () => {
    const admin = await administrador();
    const pessoa = await createUsuario();
    await solicitarRecuperacaoSenha(pessoa.email);

    const { itens } = await listNotificacoes(como(admin), { apenasNaoLidas: false, limite: 50 });
    expect(itens.find((item) => item.entidadeId === pessoa.id)).toMatchObject({ tipo: "RECUPERACAO_SENHA", entidade: "usuario" });
    expect((await avisosSobre(pessoa.id)).find((aviso) => aviso.destinatarioUsuarioId === admin.id)?.mensagem).toContain(pessoa.email);
  });

  it("finds the account whatever the case of the e-mail, and ignores spaces", async () => {
    await administrador();
    const pessoa = await createUsuario();
    await solicitarRecuperacaoSenha(`  ${pessoa.email.toUpperCase()} `);
    expect((await avisosSobre(pessoa.id)).length).toBeGreaterThan(0);
  });

  it("an unknown e-mail and an inactive account answer the same and warn nobody", async () => {
    await administrador();
    const inativa = await createUsuario({ situacao: "INATIVO" });
    await expect(solicitarRecuperacaoSenha(inativa.email)).resolves.toBeUndefined();
    expect(await avisosSobre(inativa.id)).toEqual([]);
    const antes = await owner().select({ id: schema.notificacao.id }).from(schema.notificacao).where(eq(schema.notificacao.tipo, "RECUPERACAO_SENHA"));
    await expect(solicitarRecuperacaoSenha(`ninguem-${randomUUID()}@teste.local`)).resolves.toBeUndefined();
    const depois = await owner().select({ id: schema.notificacao.id }).from(schema.notificacao).where(eq(schema.notificacao.tipo, "RECUPERACAO_SENHA"));
    expect(depois.length).toBe(antes.length);
  });

  it("repeating the request in the same hour does not flood the administrators", async () => {
    const admin = await administrador();
    const pessoa = await createUsuario();
    await solicitarRecuperacaoSenha(pessoa.email);
    await solicitarRecuperacaoSenha(pessoa.email);
    await solicitarRecuperacaoSenha(pessoa.email);
    expect((await avisosSobre(pessoa.id)).filter((aviso) => aviso.destinatarioUsuarioId === admin.id)).toHaveLength(1);
  });

  it("only administrators are warned, and an administrator is not warned about their own request", async () => {
    const outroPerfil = await createUsuario();
    await grantPerfil(outroPerfil.id, "PROFESSOR_ORIENTADOR");
    const admin = await administrador();
    const pessoa = await createUsuario();
    await solicitarRecuperacaoSenha(pessoa.email);
    const destinatarios = (await avisosSobre(pessoa.id)).map((aviso) => aviso.destinatarioUsuarioId);
    expect(destinatarios).toContain(admin.id);
    expect(destinatarios).not.toContain(outroPerfil.id);
    expect(destinatarios).not.toContain(pessoa.id);

    await solicitarRecuperacaoSenha(admin.email);
    expect((await avisosSobre(admin.id)).map((aviso) => aviso.destinatarioUsuarioId)).not.toContain(admin.id);
  });

  it("a request changes nothing in the account: only an administrator emits the password", async () => {
    await administrador();
    const pessoa = await createUsuario({ senha: "uma-senha-longa-do-teste" });
    const [antes] = await owner().select().from(schema.usuario).where(eq(schema.usuario.id, pessoa.id));
    await solicitarRecuperacaoSenha(pessoa.email);
    const [depois] = await owner().select().from(schema.usuario).where(eq(schema.usuario.id, pessoa.id));
    expect(depois.trocaSenhaObrigatoria).toBe(antes.trocaSenhaObrigatoria);
    expect(depois.senhaProvisoriaExpiraEm).toEqual(antes.senhaProvisoriaExpiraEm);
  });
});
