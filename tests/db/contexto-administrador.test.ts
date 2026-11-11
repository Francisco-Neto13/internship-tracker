import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import type { Identity } from "@/lib/identity";
import { decidirRelatorio, enviarRelatorio, getRelatorio, listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import {
  contextoDaSessao,
  encerrarContexto,
  iniciarContexto,
  listContasParaContexto,
} from "@/modules/acesso/services/contexto-service";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { assinarTce } from "@/modules/estagios/services/formalizacao-service";
import { obterDocumento } from "@/shared/documentos/documento-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, prepararEstagio } from "./estagio-helpers";

// RF003: the administrator acts as another account. The switch is a row tied to the session,
// opened only by an administrator in force; writes go through as the account, the trail records
// the administrator too, and it never reaches report content or documents, the administrator's
// own limit (RN-38).

afterAll(closeOwnerDatabase);

async function administrador() {
  const conta = await createUsuario();
  await grantPerfil(conta.id, "ADMINISTRADOR");
  return conta;
}

/** What src/lib/session.ts hands the rest of the system while a switch is open. */
const agindoComo = (usuario: { id: string }, admin: { id: string } = { id: randomUUID() }) =>
  ({ userId: usuario.id, titularId: admin.id }) as Identity;

/** Opens the switch the way POST /api/v1/contexto does, and returns what the session hands on. */
async function trocarPara(admin: { id: string }, usuario: { id: string }) {
  await iniciarContexto(como(admin), randomUUID(), usuario.id);
  return agindoComo(usuario, admin);
}

async function trilhaDe(tabela: string, registroId: string) {
  return owner()
    .select({ usuarioId: schema.auditoria.usuarioId, titularId: schema.auditoria.titularId, operacao: schema.auditoria.operacao })
    .from(schema.auditoria)
    .where(sql`${schema.auditoria.tabela} = ${tabela} and ${schema.auditoria.registroId} = ${registroId}`);
}

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
  it("signs the TCE for each party, and the trail names the administrator who did it", async () => {
    const admin = await administrador();
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["assinaturaConcedente"]);

    const assinatura = await assinarTce(await trocarPara(admin, mundo.representante), id, "CONCEDENTE", null);
    expect(assinatura).toMatchObject({ parte: "CONCEDENTE", signatarioUsuarioId: mundo.representante.id });
    expect(await trilhaDe("assinatura", assinatura.id)).toEqual([{ usuarioId: mundo.representante.id, titularId: admin.id, operacao: "INSERT" }]);

    // The account's own writes, outside a switch, carry no administrator
    const proprio = await prepararEstagio(await createMundoEstagio());
    const [linha] = await owner().select({ id: schema.assinatura.id }).from(schema.assinatura).where(eq(schema.assinatura.estagioId, proprio)).limit(1);
    expect((await trilhaDe("assinatura", linha.id))[0].titularId).toBeNull();
  });

  it("does not pin a write on an administrator without a switch open to that account", async () => {
    const admin = await administrador();
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["assinaturaConcedente"]);
    // An open switch to someone else does not cover this account either
    await iniciarContexto(como(admin), randomUUID(), mundo.aluno.id);

    const assinatura = await assinarTce(agindoComo(mundo.representante, admin), id, "CONCEDENTE", null);
    expect(await trilhaDe("assinatura", assinatura.id)).toEqual([{ usuarioId: mundo.representante.id, titularId: null, operacao: "INSERT" }]);
  });

  it("neither sends nor decides a report, whose content stays closed", async () => {
    const admin = await administrador();
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = (await listRelatorios(como(mundo.aluno), id)).find((item) => item.tipo === "PERIODICO" && item.sequencia === 1)!;

    const comoAluno = await trocarPara(admin, mundo.aluno);
    expect((await getEstagioDetalhado(comoAluno, id)).acoes.enviarRelatorio).toBe(false);
    await expect(enviarRelatorio(comoAluno, relatorio.id, { conteudo: "Pelo administrador", documentoIds: [] })).rejects.toMatchObject({ code: "CONTEXTO_SEM_RELATORIO" });

    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atividades do período", documentoIds: [] });
    const comoOrientador = await trocarPara(admin, mundo.orientador);
    expect((await getEstagioDetalhado(comoOrientador, id)).acoes.decidirRelatorio).toBe(false);
    await expect(decidirRelatorio(comoOrientador, relatorio.id, "APROVADO", null)).rejects.toMatchObject({ code: "CONTEXTO_SEM_RELATORIO" });
    expect((await getEstagioDetalhado(como(mundo.orientador), id)).acoes.decidirRelatorio).toBe(true);
  });

  it("is refused by the report policies themselves, not only by the service", async () => {
    const admin = await administrador();
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = (await listRelatorios(como(mundo.aluno), id)).find((item) => item.tipo === "PERIODICO" && item.sequencia === 1)!;
    const violaPolitica = { cause: expect.objectContaining({ message: expect.stringContaining("row-level security") }) };
    const enviar = (identity: Identity) =>
      withUser(identity, (tx) =>
        tx.execute(sql`insert into versao_relatorio (relatorio_id, conteudo, enviado_por_usuario_id) values (${relatorio.id}, 'Texto', ${mundo.aluno.id})`),
      );

    await expect(enviar(await trocarPara(admin, mundo.aluno))).rejects.toMatchObject(violaPolitica);
    await enviar(como(mundo.aluno));

    const [versao] = await owner().select({ id: schema.versaoRelatorio.id }).from(schema.versaoRelatorio).where(eq(schema.versaoRelatorio.relatorioId, relatorio.id));
    const decidir = (identity: Identity) =>
      withUser(identity, (tx) =>
        tx.execute(sql`insert into parecer_relatorio (versao_relatorio_id, decisao, emitido_por_usuario_id) values (${versao.id}, 'APROVADO', ${mundo.orientador.id})`),
      );
    await expect(decidir(await trocarPara(admin, mundo.orientador))).rejects.toMatchObject(violaPolitica);
    await decidir(como(mundo.orientador));
  });

  it("hides report content and refuses documents, the administrator's limit", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = (await listRelatorios(como(mundo.aluno), id)).find((item) => item.tipo === "PERIODICO" && item.sequencia === 1)!;
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atividades do período", documentoIds: [] });

    expect((await getRelatorio(como(mundo.orientador), relatorio.id)).versoes).toHaveLength(1);
    const vistoPeloAdministrador = await getRelatorio(agindoComo(mundo.orientador), relatorio.id);
    expect(vistoPeloAdministrador.relatorio.situacao).toBe("EM_ANALISE");
    expect(vistoPeloAdministrador.versoes).toEqual([]);

    const documento = await createDocumentoDoEstagio(id, "PLANO_ATIVIDADES", mundo.coordenador.id);
    await expect(obterDocumento(agindoComo(mundo.coordenador), documento.id)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringContaining("CONTEXTO_SEM_DOCUMENTO") }),
    });
  });
});
