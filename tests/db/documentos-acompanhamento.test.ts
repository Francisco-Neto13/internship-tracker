import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { alterarCriterio, criarCriterio, listCriterios, pdfAvaliacao, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { pdfFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { pdfRescisao } from "@/modules/estagios/services/documento-estagio-service";
import { rescindirEstagio } from "@/modules/estagios/services/encerramento-service";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RF026, RF042, RF043, RF063: the evaluation, the attendance sheet and the termination term as
// PDFs, for whoever reads them and for nobody else.

let administrador: { id: string };
let criterioId: string;

beforeAll(async () => {
  administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  criterioId = (await criarCriterio(como(administrador), { codigo: `PDF_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Assiduidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 })).id;
});

afterAll(async () => {
  await alterarCriterio(como(administrador), criterioId, { ativo: false });
  await closeOwnerDatabase();
});

const paginas = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

describe("documentos do acompanhamento", () => {
  it("renders the evaluation and the attendance sheet for the people of the internship only", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarFrequencia(como(mundo.aluno), id, { data: "2026-08-03", duracaoMinutos: 360, observacao: null });
    const criterios = await listCriterios(como(mundo.supervisor));
    const avaliacao = await registrarAvaliacao(como(mundo.supervisor), id, {
      momento: "FINAL",
      periodoInicio: null,
      periodoFim: null,
      observacoes: null,
      respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
    });

    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor, mundo.coordenador, mundo.representante]) {
      expect(await paginas(await pdfAvaliacao(como(pessoa), id, avaliacao.id)), pessoa.email).toBe(1);
      expect(await paginas(await pdfFrequencia(como(pessoa), id)), pessoa.email).toBe(1);
    }

    const outro = await createMundoEstagio();
    await expect(pdfFrequencia(como(outro.aluno), id)).rejects.toMatchObject({ kind: "NOT_FOUND" });
    await expect(pdfAvaliacao(como(outro.coordenador), id, avaliacao.id)).rejects.toMatchObject({ kind: "NOT_FOUND" });
    // RN-37: the administrator reads the internship, not its follow-up
    await expect(pdfFrequencia(como(administrador), id)).rejects.toMatchObject({ kind: "FORBIDDEN" });
    await expect(pdfAvaliacao(como(administrador), id, avaliacao.id)).rejects.toMatchObject({ kind: "FORBIDDEN" });
    await expect(pdfAvaliacao(como(mundo.aluno), id, randomUUID())).rejects.toMatchObject({ code: "AVALIACAO_NAO_ENCONTRADA" });
  });

  it("renders the termination term only once the internship was terminated", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await expect(pdfRescisao(como(mundo.coordenador), id)).rejects.toMatchObject({ code: "RESCISAO_NAO_ENCONTRADA" });
    await rescindirEstagio(como(mundo.coordenador), id, { dataRescisao: "2026-08-05", solicitante: "ESTUDANTE", motivo: "Efetivação", documentoId: null });
    for (const pessoa of [mundo.aluno, mundo.coordenador]) {
      expect(await paginas(await pdfRescisao(como(pessoa), id)), pessoa.email).toBe(1);
    }
    const outro = await createMundoEstagio();
    await expect(pdfRescisao(como(outro.aluno), id)).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});
