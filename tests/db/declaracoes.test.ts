import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { GET as verificar } from "@/app/api/v1/declaracoes/verificacao/[codigo]/route";
import VerificarDeclaracaoPage from "@/app/verificar/[codigo]/page";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { homologarFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { cadastrarAtividade, decidirAtividade } from "@/modules/atividades/services/atividade-service";
import { criarAditivo } from "@/modules/estagios/services/aditivo-service";
import { pdfAditivo, pdfPlano, pdfTce } from "@/modules/estagios/services/documento-estagio-service";
import { concluirEstagio } from "@/modules/estagios/services/encerramento-service";
import { emitirDeclaracao, listDeclaracoes } from "@/modules/integralizacao/services/declaracao-service";
import { definirArmazenamento } from "@/shared/documentos/armazenamento";
import { armazenamentoMemoria } from "@/shared/documentos/armazenamento-memoria";
import { closeOwnerDatabase, createCategoriaComLimite, createComprovanteDoEstudante, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF022 (TCE, plan and amendment as PDF) and RF058 (declarations with a verification code,
// issued only when the fact is true, RN-17, RN-35).

const armazenamento = armazenamentoMemoria();
beforeAll(async () => {
  definirArmazenamento(armazenamento);
  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `DECLARA_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Assiduidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});
afterAll(async () => {
  definirArmazenamento(undefined);
  await closeOwnerDatabase();
});

async function concluido(mundo: Mundo) {
  const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1200.00", auxilioTransporteValor: "200.00" });
  await registrarFrequencia(como(mundo.aluno), id, { data: "2026-08-03", duracaoMinutos: 360, observacao: null });
  await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-03", observacao: null });
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
  await concluirEstagio(como(mundo.coordenador), id);
  return id;
}

const paginas = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

describe("documentos do estágio (RF022)", () => {
  it("renders TCE, plan and amendment for whoever reads the internship, and nothing for others", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const pessoa of [mundo.aluno, mundo.coordenador, mundo.representante, mundo.supervisor]) {
      expect(await paginas(await pdfTce(como(pessoa), id)), pessoa.email).toBeGreaterThan(0);
    }
    expect(await paginas(await pdfPlano(como(mundo.orientador), id))).toBeGreaterThan(0);
    const aditivo = await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "Projeto estendido", novaDataFimPactuada: "2027-12-30" });
    expect(await paginas(await pdfAditivo(como(mundo.aluno), aditivo.id))).toBeGreaterThan(0);

    const estranho = await createMundoEstagio();
    await expect(pdfTce(como(estranho.aluno), id)).rejects.toMatchObject({ code: "ESTAGIO_NAO_ENCONTRADO" });
    await expect(pdfAditivo(como(estranho.coordenador), aditivo.id)).rejects.toMatchObject({ code: "ADITIVO_NAO_ENCONTRADO" });
  });
});

describe("declarações (RF058)", () => {
  it("issues the conclusion declaration of a concluded internship, stored and verifiable by its code", async () => {
    const mundo = await createMundoEstagio();
    const ativo = await estagioAtivo(mundo);
    await expect(emitirDeclaracao(como(mundo.aluno), mundo.estudante.id, { tipo: "CONCLUSAO_ESTAGIO", estagioId: ativo })).rejects.toMatchObject({
      code: "DECLARACAO_INDISPONIVEL",
    });

    const outro = await createMundoEstagio();
    const id = await concluido(outro);
    const declaracao = await emitirDeclaracao(como(outro.aluno), outro.estudante.id, { tipo: "CONCLUSAO_ESTAGIO", estagioId: id });
    expect(declaracao).toMatchObject({ tipo: "CONCLUSAO_ESTAGIO", estagioId: id, emitidaPorUsuarioId: outro.aluno.id });
    expect(declaracao.codigoVerificacao).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);

    const [documento] = await owner().select().from(schema.documento).where(eq(schema.documento.id, declaracao.documentoId));
    expect(documento).toMatchObject({ tipo: "DECLARACAO", estagioId: id, sensivel: false });
    const arquivo = armazenamento.objetos.get(documento.chaveObjeto)!;
    expect(createHash("sha256").update(arquivo).digest("hex")).toBe(documento.sha256);
    // Issued after the end: its retention period is already running (RF069)
    expect(documento.dataLiberacaoGuarda).not.toBeNull();

    const resposta = await verificar(new Request("http://localhost"), { params: Promise.resolve({ codigo: declaracao.codigoVerificacao.toLowerCase() }) });
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).data).toMatchObject({ tipo: "CONCLUSAO_ESTAGIO", sha256: documento.sha256 });
    const inexistente = await verificar(new Request("http://localhost"), { params: Promise.resolve({ codigo: "AAAA-AAAA-AAAA-AAAA" }) });
    expect(inexistente.status).toBe(404);

    // The page people open: names, never the code of the type
    const tela = JSON.stringify(await VerificarDeclaracaoPage({ params: Promise.resolve({ codigo: declaracao.codigoVerificacao }) }));
    expect(tela).toContain("Declaração autêntica");
    expect(tela).toContain("Conclusão de estágio");
    expect(tela).toContain(documento.sha256);
    expect(tela).not.toContain("CONCLUSAO_ESTAGIO");

    expect((await listDeclaracoes(como(outro.coordenador), outro.estudante.id)).map((item) => item.id)).toEqual([declaracao.id]);
    expect(await listDeclaracoes(como(mundo.coordenador), outro.estudante.id)).toEqual([]);
  });

  it("issues the activities declaration only when the latest assessment says they are complete", async () => {
    const mundo = await createMundoEstagio();
    await owner().update(schema.curso).set({ cargaAtividadesComplementaresMinutos: 10 * 60 }).where(eq(schema.curso.id, mundo.curso.id));
    await expect(emitirDeclaracao(como(mundo.aluno), mundo.estudante.id, { tipo: "INTEGRALIZACAO_ATIVIDADES", estagioId: null })).rejects.toMatchObject({
      code: "DECLARACAO_INDISPONIVEL",
    });
    const categoria = await createCategoriaComLimite(mundo.curso.id, 20 * 60);
    const comprovante = await createComprovanteDoEstudante(mundo.estudante.id, mundo.aluno.id);
    const atividade = await cadastrarAtividade(como(mundo.aluno), {
      categoriaId: categoria.id,
      descricao: "Monitoria",
      instituicaoPromotora: "UFAL",
      dataInicio: "2026-08-03",
      dataFim: "2026-08-04",
      horasDeclaradasMinutos: 10 * 60,
      documentoIds: [comprovante.id],
      origemEstagioId: null,
    });
    await decidirAtividade(como(mundo.coordenador), atividade.id, "APROVADA", null);

    const declaracao = await emitirDeclaracao(como(mundo.coordenador), mundo.estudante.id, { tipo: "INTEGRALIZACAO_ATIVIDADES", estagioId: null });
    expect(declaracao).toMatchObject({ tipo: "INTEGRALIZACAO_ATIVIDADES", apuracaoId: expect.any(String), estagioId: null, emitidaPorUsuarioId: mundo.coordenador.id });
    const [documento] = await owner().select().from(schema.documento).where(eq(schema.documento.id, declaracao.documentoId));
    expect(documento).toMatchObject({ estudanteId: mundo.estudante.id, estagioId: null });
  });

  it("refuses other people, a mismatched request and any change", async () => {
    const mundo = await createMundoEstagio();
    const id = await concluido(mundo);
    for (const pessoa of [mundo.orientador, mundo.supervisor, mundo.representante]) {
      await expect(emitirDeclaracao(como(pessoa), mundo.estudante.id, { tipo: "CONCLUSAO_ESTAGIO", estagioId: id }), pessoa.email).rejects.toMatchObject({
        code: "DECLARACAO_RESTRITA",
      });
    }
    await expect(emitirDeclaracao(como(mundo.aluno), mundo.estudante.id, { tipo: "INTEGRALIZACAO_ATIVIDADES", estagioId: id })).rejects.toMatchObject({
      code: "DECLARACAO_INVALIDA",
    });
    const antes = armazenamento.objetos.size;
    const declaracao = await emitirDeclaracao(como(mundo.aluno), mundo.estudante.id, { tipo: "CONCLUSAO_ESTAGIO", estagioId: id });
    expect(armazenamento.objetos.size).toBe(antes + 1);
    await expect(owner().update(schema.declaracao).set({ codigoVerificacao: "BBBB-BBBB-BBBB-BBBB" }).where(eq(schema.declaracao.id, declaracao.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") },
    });
  });
});
