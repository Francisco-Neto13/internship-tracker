import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import type { Identity } from "@/lib/identity";
import { enviarRelatorio, getRelatorio, listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import {
  contextoDaSessao,
  encerrarContexto,
  iniciarContexto,
  listContasParaContexto,
} from "@/modules/acesso/services/contexto-service";
import { obterDocumento } from "@/shared/documentos/documento-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RF003: the administrator sees the system as another account. The switch is a row tied to the
// session, opened only by an administrator in force, read only, and it never reaches report
// content or documents, the administrator's own limit (RN-38).

afterAll(closeOwnerDatabase);

async function administrador() {
  const conta = await createUsuario();
  await grantPerfil(conta.id, "ADMINISTRADOR");
  return conta;
}

/** What src/lib/session.ts hands the rest of the system while a switch is open. */
const vendoComo = (usuario: { id: string }) => ({ userId: usuario.id, somenteLeitura: true }) as Identity;

describe("troca de perfil do administrador (RF003)", () => {
  it("opens a switch for the session and records who looked as whom", async () => {
    const admin = await administrador();
    const alvo = await createUsuario();
    const sessao = randomUUID();

    const aberto = await iniciarContexto(como(admin), sessao, alvo.id);
    expect(aberto).toMatchObject({ usuarioId: alvo.id, nome: alvo.nome });
    expect(await contextoDaSessao(como(admin), sessao)).toMatchObject({ usuarioId: alvo.id });
    // Another session of the same administrator is not switched
    expect(await contextoDaSessao(como(admin), randomUUID())).toBeNull();

    const trilha = await owner()
      .select({ usuarioId: schema.auditoria.usuarioId, operacao: schema.auditoria.operacao })
      .from(schema.auditoria)
      .where(eq(schema.auditoria.registroId, aberto.id));
    expect(trilha).toEqual([{ usuarioId: admin.id, operacao: "INSERT" }]);
  });

  it("refuses anyone but an administrator in force", async () => {
    const mundo = await createMundoEstagio();
    for (const pessoa of [mundo.coordenador, mundo.orientador, mundo.aluno]) {
      await expect(iniciarContexto(como(pessoa), randomUUID(), mundo.representante.id)).rejects.toMatchObject({ code: "CONTEXTO_RESTRITO_AO_ADMINISTRADOR" });
      await expect(listContasParaContexto(como(pessoa), { limite: 5 })).rejects.toMatchObject({ code: "CONTEXTO_RESTRITO_AO_ADMINISTRADOR" });
    }
  });

  it("refuses an inactive account and the administrator's own", async () => {
    const admin = await administrador();
    const inativa = await createUsuario({ situacao: "INATIVO" });
    await expect(iniciarContexto(como(admin), randomUUID(), inativa.id)).rejects.toMatchObject({ code: "CONTA_INATIVA" });
    await expect(iniciarContexto(como(admin), randomUUID(), admin.id)).rejects.toMatchObject({ code: "CONTEXTO_PROPRIA_CONTA" });
    await expect(iniciarContexto(como(admin), randomUUID(), randomUUID())).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("stops holding when the administrator loses the profile", async () => {
    const admin = await createUsuario();
    const vinculo = await grantPerfil(admin.id, "ADMINISTRADOR");
    const alvo = await createUsuario();
    const sessao = randomUUID();
    await iniciarContexto(como(admin), sessao, alvo.id);

    await owner().update(schema.vinculoPerfil).set({ vigenciaFim: sql`now()` }).where(eq(schema.vinculoPerfil.id, vinculo.id));
    expect(await contextoDaSessao(como(admin), sessao)).toBeNull();
  });

  it("keeps one switch per session, ends it once, and only its owner ends it", async () => {
    const admin = await administrador();
    const outroAdmin = await administrador();
    const [primeira, segunda] = [await createUsuario(), await createUsuario()];
    const sessao = randomUUID();

    await iniciarContexto(como(admin), sessao, primeira.id);
    await iniciarContexto(como(admin), sessao, segunda.id);
    expect(await contextoDaSessao(como(admin), sessao)).toMatchObject({ usuarioId: segunda.id });

    await encerrarContexto(como(outroAdmin), sessao);
    expect(await contextoDaSessao(como(admin), sessao)).toMatchObject({ usuarioId: segunda.id });

    await encerrarContexto(como(admin), sessao);
    expect(await contextoDaSessao(como(admin), sessao)).toBeNull();

    const linhas = await owner().select().from(schema.contextoAdministrador).where(eq(schema.contextoAdministrador.sessaoId, sessao));
    expect(linhas).toHaveLength(2);
    expect(linhas.every((linha) => linha.encerradoEm !== null)).toBe(true);
    await expect(
      owner().update(schema.contextoAdministrador).set({ usuarioId: admin.id }).where(eq(schema.contextoAdministrador.id, linhas[0].id)),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringContaining("CONTEXTO_IMUTAVEL") }) });
  });

  it("lists active accounts with their profiles, never the administrator's own", async () => {
    const admin = await administrador();
    const mundo = await createMundoEstagio();
    const inativa = await createUsuario({ situacao: "INATIVO" });

    expect(await listContasParaContexto(como(admin), { busca: mundo.aluno.email, limite: 5 })).toEqual([
      { id: mundo.aluno.id, nome: mundo.aluno.nome, email: mundo.aluno.email, perfis: ["ESTUDANTE"] },
    ]);
    expect(await listContasParaContexto(como(admin), { busca: mundo.aluno.email, perfil: "SUPERVISOR", limite: 5 })).toEqual([]);
    expect(await listContasParaContexto(como(admin), { busca: inativa.email, limite: 5 })).toEqual([]);
    expect(await listContasParaContexto(como(admin), { busca: admin.email, limite: 5 })).toEqual([]);
  });
});

describe("o que a troca de perfil alcança (RF003, RN-38)", () => {
  it("reads what the account reads and saves nothing", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorios = await listRelatorios(vendoComo(mundo.aluno), id);
    expect(relatorios.length).toBeGreaterThan(0);

    const relatorio = relatorios.find((item) => item.tipo === "PERIODICO" && item.sequencia === 1)!;
    await expect(enviarRelatorio(vendoComo(mundo.aluno), relatorio.id, { conteudo: "Pelo administrador", documentoIds: [] })).rejects.toMatchObject({
      cause: expect.objectContaining({ code: "25006" }),
    });
    await expect(withUser(vendoComo(mundo.aluno), (tx) => tx.execute(sql`select app.usuario_atual_id()`))).resolves.toBeDefined();
  });

  it("hides report content and refuses documents, the administrator's limit", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = (await listRelatorios(como(mundo.aluno), id)).find((item) => item.tipo === "PERIODICO" && item.sequencia === 1)!;
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atividades do período", documentoIds: [] });

    expect((await getRelatorio(como(mundo.orientador), relatorio.id)).versoes).toHaveLength(1);
    const vistoPeloAdministrador = await getRelatorio(vendoComo(mundo.orientador), relatorio.id);
    expect(vistoPeloAdministrador.relatorio.situacao).toBe("EM_ANALISE");
    expect(vistoPeloAdministrador.versoes).toEqual([]);

    const documento = await createDocumentoDoEstagio(id, "PLANO_ATIVIDADES", mundo.coordenador.id);
    await expect(obterDocumento(vendoComo(mundo.coordenador), documento.id)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringContaining("CONTEXTO_SEM_DOCUMENTO") }),
    });
  });
});
