import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createConvenio,
  encerrarConvenio,
  getConvenio,
  listConveniosAVencer,
  renovarConvenio,
} from "@/modules/concedentes/services/convenio-service";
import { definirArmazenamento } from "@/shared/documentos/armazenamento";
import { armazenamentoMemoria } from "@/shared/documentos/armazenamento-memoria";
import { sha256Hex } from "@/shared/documentos/conteudo";
import { confirmarUpload, obterDocumento, solicitarUpload } from "@/shared/documentos/documento-service";
import { createEstagio, definirDispensaDuracao, updateTce } from "@/modules/estagios/services/estagio-service";
import { createAccessScenario, createConcedente, createMundoEstagio, createUsuario, grantPerfil, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const PDF = new TextEncoder().encode(`%PDF-1.7\nconvenio ${randomUUID()}\n%%EOF`);
const armazenamento = armazenamentoMemoria();

/** Plays the browser: asks for the URL, "uploads" the bytes and confirms. */
async function enviarConvenio(usuarioId: string, concedenteId: string, conteudo: Uint8Array = PDF, declarado?: Partial<{ sha256: string; tamanhoBytes: number; tipoMime: string }>) {
  const pedido = await solicitarUpload(identityOf(usuarioId), {
    tipo: "CONVENIO",
    tipoMime: declarado?.tipoMime ?? "application/pdf",
    tamanhoBytes: declarado?.tamanhoBytes ?? conteudo.length,
    sha256: declarado?.sha256 ?? sha256Hex(conteudo),
    nomeOriginal: "convenio.pdf",
    concedenteId,
    estagioId: null,
    estudanteId: null,
  });
  const chave = decodeURIComponent(pedido.url.replace("memoria://envio/", ""));
  armazenamento.enviar(chave, conteudo);
  return { pedido, chave };
}

beforeAll(() => definirArmazenamento(armazenamento));
afterAll(() => definirArmazenamento(undefined));

describe("document upload (D8, RNF-06)", () => {
  let s: Scenario;
  let concedenteId: string;

  beforeAll(async () => {
    s = await createAccessScenario();
    concedenteId = (await createConcedente()).id;
  });

  it("confirms a PDF that matches what was declared and keeps it under documentos/", async () => {
    const { pedido, chave } = await enviarConvenio(s.coordenadorA.id, concedenteId);

    const documento = await confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId);

    expect(documento).toMatchObject({ tipo: "CONVENIO", tipoMime: "application/pdf", tamanhoBytes: PDF.length, sha256: sha256Hex(PDF) });
    expect(documento.chaveObjeto).toMatch(/^documentos\//);
    expect(armazenamento.objetos.has(chave)).toBe(false);
    expect(armazenamento.objetos.has(documento.chaveObjeto)).toBe(true);
  });

  it("removes a file whose bytes are not the declared type", async () => {
    const html = new TextEncoder().encode("<html>não sou pdf</html>");
    const { pedido, chave } = await enviarConvenio(s.coordenadorA.id, concedenteId, html);

    await expect(confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId)).rejects.toMatchObject({ code: "UPLOAD_DIVERGENTE" });
    expect(armazenamento.objetos.has(chave)).toBe(false);
  });

  it("removes a file whose hash differs from the declared one", async () => {
    const { pedido } = await enviarConvenio(s.coordenadorA.id, concedenteId, PDF, { sha256: "0".repeat(64) });
    await expect(confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId)).rejects.toMatchObject({ code: "UPLOAD_DIVERGENTE" });
  });

  it("refuses types and sizes outside D8 before signing anything", async () => {
    await expect(enviarConvenio(s.coordenadorA.id, concedenteId, PDF, { tipoMime: "text/html" })).rejects.toMatchObject({
      code: "TIPO_ARQUIVO_NAO_PERMITIDO",
    });
    await expect(enviarConvenio(s.coordenadorA.id, concedenteId, PDF, { tamanhoBytes: 11 * 1024 * 1024 })).rejects.toMatchObject({
      code: "ARQUIVO_GRANDE_DEMAIS",
    });
  });

  it("refuses an agreement upload to a student, before any URL is signed", async () => {
    await expect(enviarConvenio(s.alunoA.id, concedenteId)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("refuses a confirmation by another user than the one who asked", async () => {
    const { pedido } = await enviarConvenio(s.coordenadorA.id, concedenteId);
    await expect(confirmarUpload(identityOf(s.administrador.id), pedido.uploadId)).rejects.toMatchObject({ code: "UPLOAD_INVALIDO" });
  });

  it("issues a download URL to who may read it, and none to a student", async () => {
    const { pedido } = await enviarConvenio(s.coordenadorA.id, concedenteId);
    const documento = await confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId);

    expect((await obterDocumento(identityOf(s.administrador.id), documento.id)).url).toMatch(/^memoria:\/\/leitura\//);
    await expect(obterDocumento(identityOf(s.alunoA.id), documento.id)).rejects.toMatchObject({ code: "DOCUMENTO_NAO_ENCONTRADO" });
  });
});

describe("agreements and periods (RF009 to RF012, RN-02)", () => {
  let s: Scenario;
  let concedenteId: string;

  beforeAll(async () => {
    s = await createAccessScenario();
    concedenteId = (await createConcedente()).id;
  });

  async function documentoConvenio() {
    const { pedido } = await enviarConvenio(s.coordenadorA.id, concedenteId);
    return (await confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId)).id;
  }

  it("registers an agreement with its first period and renews it keeping the history", async () => {
    const criado = await createConvenio(identityOf(s.coordenadorA.id), concedenteId, {
      numero: `CV-${randomUUID().slice(0, 8)}`,
      observacao: null,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      documentoId: await documentoConvenio(),
    });
    expect(criado.vigenteEm("2026-12-31")).toBe(true);
    expect(criado.vigenteEm("2027-01-01")).toBe(false);

    const renovado = await renovarConvenio(identityOf(s.coordenadorA.id), criado.id, {
      vigenciaInicio: "2027-01-01",
      vigenciaFim: "2028-12-31",
      documentoId: await documentoConvenio(),
    });
    expect(renovado.vigencias.map((v) => [v.vigenciaInicio, v.vigenciaFim])).toEqual([
      ["2026-01-01", "2026-12-31"],
      ["2027-01-01", "2028-12-31"],
    ]);
    expect(renovado.vigencias[1].renovaVigenciaId).toBe(renovado.vigencias[0].id);
  });

  it("refuses a renewal that starts before the current period ends", async () => {
    const criado = await createConvenio(identityOf(s.administrador.id), concedenteId, {
      numero: `CV-${randomUUID().slice(0, 8)}`,
      observacao: null,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      documentoId: await documentoConvenio(),
    });

    await expect(
      renovarConvenio(identityOf(s.administrador.id), criado.id, {
        vigenciaInicio: "2026-06-01",
        vigenciaFim: "2027-06-01",
        documentoId: await documentoConvenio(),
      }),
    ).rejects.toMatchObject({ code: "RENOVACAO_ANTES_DO_FIM" });
  });

  it("blocks overlapping periods in the database, even for the owner", async () => {
    const criado = await createConvenio(identityOf(s.administrador.id), concedenteId, {
      numero: `CV-${randomUUID().slice(0, 8)}`,
      observacao: null,
      vigenciaInicio: "2030-01-01",
      vigenciaFim: "2030-12-31",
      documentoId: await documentoConvenio(),
    });
    const vigencia = criado.vigencias[0];

    await expect(
      owner().execute(sql`
        insert into convenio_vigencia (convenio_id, vigencia_inicio, vigencia_fim, documento_id, registrado_por_usuario_id)
        values (${criado.id}, '2030-12-31', '2031-06-30', ${vigencia.documentoId}, ${s.administrador.id})
      `),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ constraint: "convenio_vigencia_sem_sobreposicao" }) });
  });

  it("requires a document of type CONVENIO from the same concedente", async () => {
    const outra = await createConcedente();
    const { pedido } = await enviarConvenio(s.coordenadorA.id, outra.id);
    const deOutra = await confirmarUpload(identityOf(s.coordenadorA.id), pedido.uploadId);

    await expect(
      createConvenio(identityOf(s.coordenadorA.id), concedenteId, {
        numero: `CV-${randomUUID().slice(0, 8)}`,
        observacao: null,
        vigenciaInicio: "2026-01-01",
        vigenciaFim: "2026-12-31",
        documentoId: deOutra.id,
      }),
    ).rejects.toMatchObject({ code: "DOCUMENTO_INVALIDO" });
  });

  it("ends an agreement early: it stops counting as valid", async () => {
    const criado = await createConvenio(identityOf(s.administrador.id), concedenteId, {
      numero: `CV-${randomUUID().slice(0, 8)}`,
      observacao: null,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      documentoId: await documentoConvenio(),
    });

    await encerrarConvenio(identityOf(s.administrador.id), criado.id, "Denúncia pela concedente");
    const encerrado = await getConvenio(identityOf(s.administrador.id), criado.id);
    expect(encerrado.situacao).toBe("ENCERRADO");
    expect(encerrado.vigenteEm("2026-06-01")).toBe(false);
  });

  it("lists agreements lapsing within the lead time, without a later period", async () => {
    const numero = `CV-${randomUUID().slice(0, 8)}`;
    const criado = await createConvenio(identityOf(s.administrador.id), concedenteId, {
      numero,
      observacao: null,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2040-03-10",
      documentoId: await documentoConvenio(),
    });

    const dentro = await listConveniosAVencer(identityOf(s.coordenadorA.id), "2040-02-01", 60);
    const fora = await listConveniosAVencer(identityOf(s.coordenadorA.id), "2040-01-01", 30);
    expect(dentro.map((item) => item.id)).toContain(criado.id);
    expect(fora.map((item) => item.id)).not.toContain(criado.id);
  });

  it("lets the concedente read its agreements and refuses writes to it", async () => {
    const representante = await createUsuario();
    await grantPerfil(representante.id, "CONCEDENTE", { concedenteId });
    const criado = await createConvenio(identityOf(s.administrador.id), concedenteId, {
      numero: `CV-${randomUUID().slice(0, 8)}`,
      observacao: null,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      documentoId: await documentoConvenio(),
    });

    expect((await getConvenio(identityOf(representante.id), criado.id)).numero).toBe(criado.numero);
    await expect(encerrarConvenio(identityOf(representante.id), criado.id, "x")).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(getConvenio(identityOf(s.alunoA.id), criado.id)).rejects.toMatchObject({ code: "CONVENIO_NAO_ENCONTRADO" });
  });
});

describe("internship documents and the art. 11 exemption (D5, RN-38, RF071)", () => {
  it("records the exemption with a sensitive document the administrator cannot download", async () => {
    const mundo = await createMundoEstagio();
    const criado = await createEstagio(identityOf(mundo.coordenador.id), {
      estudanteId: mundo.estudante.id,
      concedenteId: mundo.concedente.id,
      convenioId: mundo.convenio.id,
      tipo: "OBRIGATORIO",
      dataInicio: "2026-11-02",
      dataFimPactuada: "2027-11-01",
      cargaDiariaMinutos: 360,
      cargaSemanalMinutos: 1800,
      cargaTotalMinutos: 24000,
      condicoesPactuadas: "Atividades",
      bolsaValor: null,
      auxilioTransporteValor: null,
      seguroExigido: true,
    });
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");

    await expect(
      solicitarUpload(identityOf(mundo.aluno.id), {
        tipo: "DISPENSA_DURACAO",
        tipoMime: "application/pdf",
        tamanhoBytes: PDF.length,
        sha256: sha256Hex(PDF),
        nomeOriginal: "laudo.pdf",
        concedenteId: null,
        estagioId: criado.id,
        estudanteId: null,
      }),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO" });

    const pedido = await solicitarUpload(identityOf(mundo.coordenador.id), {
      tipo: "DISPENSA_DURACAO",
      tipoMime: "application/pdf",
      tamanhoBytes: PDF.length,
      sha256: sha256Hex(PDF),
      nomeOriginal: "laudo.pdf",
      concedenteId: null,
      estagioId: criado.id,
      estudanteId: null,
    });
    armazenamento.enviar(decodeURIComponent(pedido.url.replace("memoria://envio/", "")), PDF);
    const laudo = await confirmarUpload(identityOf(mundo.coordenador.id), pedido.uploadId);
    expect(laudo.sensivel).toBe(true);

    await definirDispensaDuracao(identityOf(mundo.coordenador.id), criado.id, laudo.id);
    const longo = await updateTce(identityOf(mundo.coordenador.id), criado.id, { dataFimPactuada: "2029-06-30" });
    expect(longo.dataFimPactuada).toBe("2029-06-30");

    expect((await obterDocumento(identityOf(mundo.coordenador.id), laudo.id)).url).not.toBeNull();
    expect((await obterDocumento(identityOf(mundo.aluno.id), laudo.id)).url).not.toBeNull();
    const vistoPeloAdministrador = await obterDocumento(identityOf(administrador.id), laudo.id);
    expect(vistoPeloAdministrador.documento.id).toBe(laudo.id);
    expect(vistoPeloAdministrador.url).toBeNull();
    await expect(obterDocumento(identityOf(mundo.supervisor.id), laudo.id)).rejects.toMatchObject({ code: "DOCUMENTO_NAO_ENCONTRADO" });
  });
});
