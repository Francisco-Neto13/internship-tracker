import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { auditoria, conta, sessao, usuario, vinculoPerfil } from "@/db/schema";
import { resolveSession } from "@/lib/session";
import {
  createUsuario as criarUsuario,
  getUsuario,
  inativarUsuario,
  listUsuarios,
  reativarUsuario,
  substituirPerfis,
  updateUsuarioDados,
} from "@/modules/acesso/services/usuario-service";
import { createAccessScenario, createUsuario, grantPerfil, identityOf, owner, signIn } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const SENHA = "senha-de-teste-bem-longa";

function emailNovo() {
  return `novo-${randomUUID().slice(0, 8)}@teste.local`;
}

async function ultimaAuditoria(tabela: string, registroId: string) {
  const [row] = await owner()
    .select()
    .from(auditoria)
    .where(and(eq(auditoria.tabela, tabela), eq(auditoria.registroId, registroId)))
    .orderBy(desc(auditoria.id))
    .limit(1);
  return row;
}

describe("user creation by the administrator (RF001, RF002)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("creates the user, its links and a temporary password that signs in", async () => {
    const email = emailNovo();

    const { usuario: criado, senhaProvisoria } = await criarUsuario(identityOf(s.administrador.id), {
      nome: "Pessoa Nova",
      email,
      perfis: [{ perfil: "COORDENACAO", cursoId: s.cursoA.id }],
    });

    expect(criado).toMatchObject({ nome: "Pessoa Nova", email, situacao: "ATIVO", trocaSenhaObrigatoria: true });
    expect(criado.perfis).toEqual([expect.objectContaining({ perfil: "COORDENACAO", cursoId: s.cursoA.id })]);
    expect(senhaProvisoria.length).toBeGreaterThanOrEqual(15);

    const horas = (criado.senhaProvisoriaExpiraEm!.getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(71);
    expect(horas).toBeLessThanOrEqual(72);

    const resolved = await resolveSession(await signIn(email, senhaProvisoria));
    expect(resolved?.identity.userId).toBe(criado.id);
  });

  it("stores only the hash of the temporary password", async () => {
    const { usuario: criado, senhaProvisoria } = await criarUsuario(identityOf(s.administrador.id), {
      nome: "Pessoa Hash",
      email: emailNovo(),
      perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
    });

    const [credencial] = await owner().select().from(conta).where(eq(conta.usuarioId, criado.id));
    expect(credencial.senhaHash).toMatch(/^\$argon2id\$/);
    expect(credencial.senhaHash).not.toContain(senhaProvisoria);
  });

  it("records the administrator as the author of the creation (RN-28)", async () => {
    const { usuario: criado } = await criarUsuario(identityOf(s.administrador.id), {
      nome: "Pessoa Auditada",
      email: emailNovo(),
      perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
    });

    const registro = await ultimaAuditoria("usuario", criado.id);
    expect(registro).toMatchObject({ operacao: "INSERT", usuarioId: s.administrador.id });
  });

  it("refuses creation by anyone who is not an administrator", async () => {
    const email = emailNovo();

    await expect(
      criarUsuario(identityOf(s.coordenadorA.id), { nome: "Intruso", email, perfis: [{ perfil: "ESTUDANTE", cursoId: null }] }),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO", kind: "FORBIDDEN" });

    expect(await owner().select().from(usuario).where(eq(usuario.email, email))).toEqual([]);
  });

  it("reports a repeated e-mail as a conflict", async () => {
    await expect(
      criarUsuario(identityOf(s.administrador.id), {
        nome: "Repetido",
        email: s.alunoA.email,
        perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
      }),
    ).rejects.toMatchObject({ code: "EMAIL_DUPLICADO", kind: "CONFLICT" });
  });

  it("rejects invalid links before touching the database", async () => {
    const email = emailNovo();

    await expect(
      criarUsuario(identityOf(s.administrador.id), {
        nome: "Sem curso",
        email,
        perfis: [{ perfil: "COORDENACAO", cursoId: null }],
      }),
    ).rejects.toMatchObject({ code: "VINCULOS_INVALIDOS", kind: "UNPROCESSABLE" });
    expect(await owner().select().from(usuario).where(eq(usuario.email, email))).toEqual([]);
  });

  it("reports coordination of a course that does not exist", async () => {
    await expect(
      criarUsuario(identityOf(s.administrador.id), {
        nome: "Curso fantasma",
        email: emailNovo(),
        perfis: [{ perfil: "COORDENACAO", cursoId: randomUUID() }],
      }),
    ).rejects.toMatchObject({ code: "CURSO_INEXISTENTE" });
  });
});

describe("user listing under RLS (RF001, RF003)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets the administrator filter by profile with the links in force", async () => {
    const { items } = await listUsuarios(identityOf(s.administrador.id), { page: 1, limit: 100, perfil: "COORDENACAO", busca: s.coordenadorA.email });

    const coordenador = items.find((item) => item.id === s.coordenadorA.id);
    expect(coordenador?.perfis).toEqual([expect.objectContaining({ perfil: "COORDENACAO", cursoId: s.cursoA.id })]);
    expect(items.every((item) => item.perfis.some((vinculo) => vinculo.perfil === "COORDENACAO"))).toBe(true);
  });

  it("searches name and e-mail literally, without LIKE wildcards", async () => {
    const marca = randomUUID().slice(0, 6);
    const literal = await createUsuario();
    await owner().update(usuario).set({ nome: `Desconto 50% ${marca}` }).where(eq(usuario.id, literal.id));
    const parecido = await createUsuario();
    await owner().update(usuario).set({ nome: `Desconto 500 ${marca}` }).where(eq(usuario.id, parecido.id));

    const { items } = await listUsuarios(identityOf(s.administrador.id), { page: 1, limit: 100, busca: `50% ${marca}` });

    expect(items.map((item) => item.id)).toEqual([literal.id]);
  });

  it("shows a user without profile only their own account", async () => {
    const { items, total } = await listUsuarios(identityOf(s.semPerfil.id), { page: 1, limit: 100 });

    expect(items.map((item) => item.id)).toEqual([s.semPerfil.id]);
    expect(total).toBe(1);
  });

  it("returns the link history with closed links", async () => {
    const pessoa = await createUsuario();
    await grantPerfil(pessoa.id, "ESTUDANTE", {
      vigenciaInicio: new Date(Date.now() - 2 * 86_400_000),
      vigenciaFim: new Date(Date.now() - 86_400_000),
    });
    await grantPerfil(pessoa.id, "PROFESSOR_ORIENTADOR");

    const detalhe = await getUsuario(identityOf(s.administrador.id), pessoa.id);

    expect(detalhe.perfis.map((vinculo) => vinculo.perfil)).toEqual(["PROFESSOR_ORIENTADOR"]);
    expect(detalhe.historico.map((vinculo) => vinculo.perfil).sort()).toEqual(["ESTUDANTE", "PROFESSOR_ORIENTADOR"]);
  });

  it("answers 404 for a user the caller cannot see", async () => {
    await expect(getUsuario(identityOf(s.semPerfil.id), s.alunoB.id)).rejects.toMatchObject({
      code: "USUARIO_NAO_ENCONTRADO",
      kind: "NOT_FOUND",
    });
  });
});

describe("user edition and inactivation (RF001)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets the administrator rename a user and change the e-mail", async () => {
    const pessoa = await createUsuario();
    const novoEmail = emailNovo();

    const atualizado = await updateUsuarioDados(identityOf(s.administrador.id), pessoa.id, {
      nome: "Nome Corrigido",
      email: novoEmail,
    });

    expect(atualizado).toMatchObject({ nome: "Nome Corrigido", email: novoEmail });
  });

  it("refuses edition to a user who can see but not manage the account", async () => {
    await expect(updateUsuarioDados(identityOf(s.semPerfil.id), s.semPerfil.id, { nome: "Eu mesmo" })).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
  });

  it("hides accounts the caller cannot see behind 404", async () => {
    await expect(updateUsuarioDados(identityOf(s.semPerfil.id), s.alunoA.id, { nome: "Outro" })).rejects.toMatchObject({
      code: "USUARIO_NAO_ENCONTRADO",
    });
  });

  it("does not let the database accept columns outside the grant", async () => {
    const { rows } = await owner().execute<{ coluna: string }>(sql`
      select column_name as coluna
        from information_schema.column_privileges
       where grantee = 'app_runtime' and table_name = 'usuario' and privilege_type = 'UPDATE'
       order by column_name
    `);

    expect(rows.map((row) => row.coluna)).toEqual([
      "email",
      "nome",
      "senha_provisoria_expira_em",
      "situacao",
      "troca_senha_obrigatoria",
    ]);
  });

  it("inactivates without deleting, revokes sessions and records the author", async () => {
    const pessoa = await createUsuario({ senha: SENHA });
    await signIn(pessoa.email, SENHA);

    const inativado = await inativarUsuario(identityOf(s.administrador.id), pessoa.id);

    expect(inativado.situacao).toBe("INATIVO");
    expect(await owner().select().from(sessao).where(eq(sessao.usuarioId, pessoa.id))).toEqual([]);
    expect(await owner().select().from(usuario).where(eq(usuario.id, pessoa.id))).toHaveLength(1);
    expect(await ultimaAuditoria("usuario", pessoa.id)).toMatchObject({
      operacao: "UPDATE",
      usuarioId: s.administrador.id,
      camposAlterados: expect.arrayContaining(["situacao"]),
    });
  });

  it("treats a second inactivation as a conflict, and reactivation restores access", async () => {
    const pessoa = await createUsuario({ senha: SENHA });
    await inativarUsuario(identityOf(s.administrador.id), pessoa.id);

    await expect(inativarUsuario(identityOf(s.administrador.id), pessoa.id)).rejects.toMatchObject({
      code: "USUARIO_JA_INATIVO",
      kind: "CONFLICT",
    });

    const reativado = await reativarUsuario(identityOf(s.administrador.id), pessoa.id);
    expect(reativado.situacao).toBe("ATIVO");
    expect((await resolveSession(await signIn(pessoa.email, SENHA)))?.identity.userId).toBe(pessoa.id);

    await expect(reativarUsuario(identityOf(s.administrador.id), pessoa.id)).rejects.toMatchObject({
      code: "USUARIO_JA_ATIVO",
    });
  });

  it("forbids the administrator from inactivating their own account", async () => {
    await expect(inativarUsuario(identityOf(s.administrador.id), s.administrador.id)).rejects.toMatchObject({
      code: "AUTOINATIVACAO_VEDADA",
    });
  });

  it("refuses inactivation by coordination", async () => {
    await expect(inativarUsuario(identityOf(s.coordenadorA.id), s.alunoA.id)).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
  });
});

describe("profile link replacement (RF001, RF003)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("closes removed links, keeps the ones that stay and opens new ones", async () => {
    const pessoa = await createUsuario();
    const estudante = await grantPerfil(pessoa.id, "ESTUDANTE");
    const coordenacao = await grantPerfil(pessoa.id, "COORDENACAO", { cursoId: s.cursoA.id });

    const vigentes = await substituirPerfis(identityOf(s.administrador.id), pessoa.id, [
      { perfil: "COORDENACAO", cursoId: s.cursoA.id },
      { perfil: "PROFESSOR_ORIENTADOR", cursoId: null },
    ]);

    expect(vigentes.map((vinculo) => vinculo.perfil).sort()).toEqual(["COORDENACAO", "PROFESSOR_ORIENTADOR"]);
    expect(vigentes.find((vinculo) => vinculo.perfil === "COORDENACAO")?.id).toBe(coordenacao.id);

    const [encerrado] = await owner().select().from(vinculoPerfil).where(eq(vinculoPerfil.id, estudante.id));
    expect(encerrado.vigenciaFim).not.toBeNull();
  });

  it("takes effect on the next request: a removed coordination stops seeing students", async () => {
    const pessoa = await createUsuario();
    await grantPerfil(pessoa.id, "COORDENACAO", { cursoId: s.cursoA.id });

    await substituirPerfis(identityOf(s.administrador.id), pessoa.id, [{ perfil: "PROFESSOR_ORIENTADOR", cursoId: null }]);

    const { items } = await listUsuarios(identityOf(pessoa.id), { page: 1, limit: 100 });
    expect(items.map((item) => item.id)).toEqual([pessoa.id]);
  });

  it("forbids the administrator from dropping their own administrator profile", async () => {
    await expect(
      substituirPerfis(identityOf(s.administrador.id), s.administrador.id, [{ perfil: "ESTUDANTE", cursoId: null }]),
    ).rejects.toMatchObject({ code: "AUTORREMOCAO_ADMINISTRADOR_VEDADA" });
  });

  it("refuses replacement by anyone who is not an administrator", async () => {
    await expect(
      substituirPerfis(identityOf(s.coordenadorA.id), s.coordenadorA.id, [{ perfil: "ADMINISTRADOR", cursoId: null }]),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("answers 404 for an unknown user", async () => {
    await expect(
      substituirPerfis(identityOf(s.administrador.id), randomUUID(), [{ perfil: "ESTUDANTE", cursoId: null }]),
    ).rejects.toMatchObject({ code: "USUARIO_NAO_ENCONTRADO" });
  });
});
