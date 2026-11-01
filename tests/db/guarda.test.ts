import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { eliminarDocumentoVencido, listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { concluirEstagio, rescindirEstagio } from "@/modules/estagios/services/encerramento-service";
import { definirArmazenamento } from "@/shared/documentos/armazenamento";
import { armazenamentoMemoria } from "@/shared/documentos/armazenamento-memoria";
import {
  closeOwnerDatabase,
  createComprovanteDoEstudante,
  createConcedente,
  createDocumentoDoEstagio,
  createMundoEstagio,
  createUsuario,
  grantPerfil,
  owner,
} from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF069, RN-30 (DER §5.11): the retention period counts from the end of each scope, the row
// of a document is never deleted and only the administrator eliminates the object after it.

const armazenamento = armazenamentoMemoria();
let administrador: { id: string };

beforeAll(async () => {
  definirArmazenamento(armazenamento);
  administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `GUARDA_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Iniciativa", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});
afterAll(async () => {
  definirArmazenamento(undefined);
  await closeOwnerDatabase();
});

const hoje = async () => (await owner().execute<{ hoje: string }>(sql`select app.hoje()::text as hoje`)).rows[0].hoje;
const emCincoAnos = (data: string) => `${Number(data.slice(0, 4)) + 5}${data.slice(4)}`;
const documento = async (id: string) => (await owner().select().from(schema.documento).where(eq(schema.documento.id, id)))[0];

async function concluido(mundo: Mundo) {
  const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1200.00", auxilioTransporteValor: "200.00" });
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
  return id;
}

describe("prazo de guarda (DER §5.11)", () => {
  it("starts when the internship ends, for every document of it, and for documents sent after", async () => {
    const mundo = await createMundoEstagio();
    const id = await concluido(mundo);
    const tce = await createDocumentoDoEstagio(id, "TCE", mundo.coordenador.id);
    expect(tce.dataLiberacaoGuarda).toBeNull();
    await concluirEstagio(como(mundo.coordenador), id);
    const fim = emCincoAnos(await hoje());
    expect((await documento(tce.id)).dataLiberacaoGuarda).toBe(fim);
    const depois = await createDocumentoDoEstagio(id, "DECLARACAO", mundo.coordenador.id);
    expect(depois.dataLiberacaoGuarda).toBe(fim);
  });

  it("starts at the rescission too, with the parameter in force on that day", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const atestado = await createDocumentoDoEstagio(id, "ATESTADO_AFASTAMENTO", mundo.coordenador.id);
    await rescindirEstagio(como(mundo.coordenador), id, { dataRescisao: "2026-08-05", solicitante: "CONCEDENTE", motivo: "Encerramento do setor", documentoId: null });
    expect((await documento(atestado.id)).dataLiberacaoGuarda).toBe(emCincoAnos(await hoje()));
  });

  it("follows the latest validity of an agreement and the end of the student's course", async () => {
    const concedente = await createConcedente();
    const [convenio] = await owner().insert(schema.convenio).values({ concedenteId: concedente.id, numero: `CV-G-${randomUUID().slice(0, 6)}` }).returning();
    const [arquivo] = await owner()
      .insert(schema.documento)
      .values({ tipo: "CONVENIO", chaveObjeto: `documentos/guarda-${randomUUID()}.pdf`, nomeOriginal: "c.pdf", tipoMime: "application/pdf", tamanhoBytes: 1, sha256: "2".repeat(64), concedenteId: concedente.id, enviadoPorUsuarioId: administrador.id })
      .returning();
    await owner().insert(schema.convenioVigencia).values({ convenioId: convenio.id, vigenciaInicio: "2026-01-01", vigenciaFim: "2027-12-31", documentoId: arquivo.id, registradoPorUsuarioId: administrador.id });
    expect((await documento(arquivo.id)).dataLiberacaoGuarda).toBe("2032-12-31");
    await owner().insert(schema.convenioVigencia).values({ convenioId: convenio.id, vigenciaInicio: "2028-01-01", vigenciaFim: "2029-12-31", documentoId: arquivo.id, registradoPorUsuarioId: administrador.id });
    expect((await documento(arquivo.id)).dataLiberacaoGuarda).toBe("2034-12-31");

    const mundo = await createMundoEstagio();
    const comprovante = await createComprovanteDoEstudante(mundo.estudante.id, mundo.aluno.id);
    expect(comprovante.dataLiberacaoGuarda).toBeNull();
    await owner().update(schema.estudante).set({ situacaoAcademica: "FORMADO" }).where(eq(schema.estudante.id, mundo.estudante.id));
    expect((await documento(comprovante.id)).dataLiberacaoGuarda).toBe(emCincoAnos(await hoje()));
  });
});

describe("exclusão e eliminação (RF069, RN-30)", () => {
  it("no one deletes a document row nor rewrites its retention date", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const tce = await createDocumentoDoEstagio(id, "TCE", mundo.coordenador.id);
    await expect(owner().delete(schema.documento).where(eq(schema.documento.id, tce.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("EXCLUSAO_BLOQUEADA_GUARDA") },
    });
    await expect(
      withUser(como(administrador), (tx) => tx.update(schema.documento).set({ dataLiberacaoGuarda: "2026-01-01" }).where(eq(schema.documento.id, tce.id))),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("only the administrator eliminates, only after the period, removing the object and keeping the row", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const atestado = await createDocumentoDoEstagio(id, "ATESTADO_AFASTAMENTO", mundo.coordenador.id);
    armazenamento.enviar(atestado.chaveObjeto, new Uint8Array([1, 2, 3]));

    await expect(eliminarDocumentoVencido(como(administrador), atestado.id)).rejects.toMatchObject({ code: "EXCLUSAO_BLOQUEADA_GUARDA" });
    await owner().update(schema.documento).set({ dataLiberacaoGuarda: "2026-01-01" }).where(eq(schema.documento.id, atestado.id));

    expect((await listDocumentosEmGuarda(como(administrador), null)).find((item) => item.id === atestado.id)).toMatchObject({
      tipo: "ATESTADO_AFASTAMENTO",
      sensivel: true,
      escopo: "ESTAGIO",
      dataLiberacaoGuarda: "2026-01-01",
    });
    expect(await listDocumentosEmGuarda(como(mundo.coordenador), null)).toEqual([]);
    await expect(eliminarDocumentoVencido(como(mundo.coordenador), atestado.id)).rejects.toMatchObject({ code: "ELIMINACAO_RESTRITA" });
    expect(armazenamento.objetos.has(atestado.chaveObjeto)).toBe(true);

    const { eliminadoEm } = await eliminarDocumentoVencido(como(administrador), atestado.id);
    expect(armazenamento.objetos.has(atestado.chaveObjeto)).toBe(false);
    expect(await documento(atestado.id)).toMatchObject({ eliminadoEm, eliminadoPorUsuarioId: administrador.id, sha256: atestado.sha256 });
    const trilha = await owner()
      .select()
      .from(schema.auditoria)
      .where(and(eq(schema.auditoria.tabela, "documento"), eq(schema.auditoria.registroId, atestado.id), eq(schema.auditoria.operacao, "UPDATE")));
    expect(trilha.map((linha) => linha.usuarioId)).toContain(administrador.id);
    expect((await listDocumentosEmGuarda(como(administrador), null)).some((item) => item.id === atestado.id)).toBe(false);
    await expect(eliminarDocumentoVencido(como(administrador), atestado.id)).rejects.toMatchObject({ code: "DOCUMENTO_NAO_ENCONTRADO" });
  });
});
