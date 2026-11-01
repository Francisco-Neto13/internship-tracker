import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { definirArmazenamento } from "@/shared/documentos/armazenamento";
import { armazenamentoMemoria } from "@/shared/documentos/armazenamento-memoria";
import { listarAcessosDocumento, obterDocumento } from "@/shared/documentos/documento-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RN-38, RF071 to RF073 (RNF-05): health data read only by the student, the advisor and the
// coordination; each read recorded in the append-only trail; the record consulted by the
// holder, the coordination and the administrator, never with the content.

afterAll(closeOwnerDatabase);
beforeAll(() => definirArmazenamento(armazenamentoMemoria()));

async function cenario() {
  const mundo = await createMundoEstagio();
  const id = await estagioAtivo(mundo);
  const dispensa = await createDocumentoDoEstagio(id, "DISPENSA_DURACAO", mundo.coordenador.id);
  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  return { mundo, id, dispensa, administrador };
}

const leituras = (documentoId: string) =>
  owner()
    .select()
    .from(schema.auditoria)
    .where(and(eq(schema.auditoria.tabela, "documento"), eq(schema.auditoria.registroId, documentoId), eq(schema.auditoria.operacao, "LEITURA")));

describe("acesso a documento sensível (RF071)", () => {
  it("student, advisor and coordination download; supervisor and concedente do not even see it", async () => {
    const { mundo, dispensa } = await cenario();
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.coordenador]) {
      const { url } = await obterDocumento(como(pessoa), dispensa.id);
      expect(url, pessoa.email).not.toBeNull();
    }
    for (const pessoa of [mundo.supervisor, mundo.representante]) {
      await expect(obterDocumento(como(pessoa), dispensa.id)).rejects.toMatchObject({ code: "DOCUMENTO_NAO_ENCONTRADO" });
    }
  });

  it("the administrator sees the metadata for retention, without a download URL", async () => {
    const { dispensa, administrador } = await cenario();
    const { documento, url } = await obterDocumento(como(administrador), dispensa.id);
    expect(documento?.id).toBe(dispensa.id);
    expect(url).toBeNull();
    expect(await leituras(dispensa.id)).toHaveLength(0);
  });
});

describe("registro de leitura (RF072)", () => {
  it("records each read with user, profile, date and time, without content", async () => {
    const { mundo, dispensa } = await cenario();
    await obterDocumento(como(mundo.aluno), dispensa.id);
    await obterDocumento(como(mundo.orientador), dispensa.id);
    await obterDocumento(como(mundo.coordenador), dispensa.id);
    await obterDocumento(como(mundo.coordenador), dispensa.id);

    const linhas = await leituras(dispensa.id);
    expect(linhas.map((linha) => [linha.usuarioId, (linha.dadosNovos as { perfil: string }).perfil]).sort()).toEqual(
      [
        [mundo.aluno.id, "ESTUDANTE"],
        [mundo.orientador.id, "PROFESSOR_ORIENTADOR"],
        [mundo.coordenador.id, "COORDENACAO"],
        [mundo.coordenador.id, "COORDENACAO"],
      ].sort(),
    );
    expect(linhas.every((linha) => linha.dadosAnteriores === null && linha.ocorridoEm instanceof Date)).toBe(true);
    expect(JSON.stringify(linhas)).not.toContain(dispensa.chaveObjeto);
  });

  it("a non-sensitive document is downloaded without a read record", async () => {
    const { mundo, id } = await cenario();
    const apolice = await createDocumentoDoEstagio(id, "APOLICE", mundo.representante.id);
    expect((await obterDocumento(como(mundo.supervisor), apolice.id)).url).not.toBeNull();
    expect(await leituras(apolice.id)).toHaveLength(0);
  });

  it("the read trail is append-only, the owner included", async () => {
    const { mundo, dispensa } = await cenario();
    await obterDocumento(como(mundo.aluno), dispensa.id);
    const [linha] = await leituras(dispensa.id);
    await expect(owner().update(schema.auditoria).set({ usuarioId: null }).where(eq(schema.auditoria.id, linha.id))).rejects.toBeDefined();
    await expect(owner().delete(schema.auditoria).where(eq(schema.auditoria.id, linha.id))).rejects.toBeDefined();
  });
});

describe("consulta dos acessos (RF073)", () => {
  it("the holder, the coordination and the administrator see who read; others do not", async () => {
    const { mundo, dispensa, administrador } = await cenario();
    await obterDocumento(como(mundo.orientador), dispensa.id);
    await obterDocumento(como(mundo.coordenador), dispensa.id);

    for (const pessoa of [mundo.aluno, mundo.coordenador, administrador]) {
      const acessos = await listarAcessosDocumento(como(pessoa), dispensa.id);
      expect(acessos.map((acesso) => acesso.perfil).sort()).toEqual(["COORDENACAO", "PROFESSOR_ORIENTADOR"]);
      expect(acessos.find((acesso) => acesso.perfil === "PROFESSOR_ORIENTADOR")?.usuarioNome).toBe(mundo.orientador.nome);
    }
    await expect(listarAcessosDocumento(como(mundo.orientador), dispensa.id)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(listarAcessosDocumento(como(mundo.supervisor), dispensa.id)).rejects.toMatchObject({ code: "DOCUMENTO_NAO_ENCONTRADO" });
  });

  it("applies only to sensitive documents", async () => {
    const { mundo, id } = await cenario();
    const apolice = await createDocumentoDoEstagio(id, "APOLICE", mundo.representante.id);
    await expect(listarAcessosDocumento(como(mundo.coordenador), apolice.id)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
});
