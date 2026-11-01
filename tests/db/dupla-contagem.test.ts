import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { homologarFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { cadastrarAtividade } from "@/modules/atividades/services/atividade-service";
import { traduzirErroEstagio } from "@/modules/estagios/services/erros";
import { closeOwnerDatabase, createCategoriaComLimite, createComprovanteDoEstudante, createMundoEstagio, createUsuario, grantPerfil } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// Fase 4 exit criterion (DER-LOGICO §5.9, RN-36, RF046, RF047): the same hours never count as
// mandatory internship and as complementary activity. Written before the barrier
// app.validar_origem_estagio existed and run to fail first; each case breaks one condition.

afterAll(closeOwnerDatabase);

beforeAll(async () => {
  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `DUPLA_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Pontualidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});

const naoObrigatorio = { tipo: "NAO_OBRIGATORIO" as const, bolsaValor: "1000.00", auxilioTransporteValor: "150.00" };

/** Two homologated days of 6 h, the final evaluation and the conclusion (as Fase 5 will do it). */
async function concluir(mundo: Mundo, id: string) {
  for (const data of ["2026-08-03", "2026-08-04"]) await registrarFrequencia(como(mundo.aluno), id, { data, duracaoMinutos: 360, observacao: null });
  await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-04", observacao: null });
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
  await withUser(como(mundo.coordenador), (tx) => tx.update(schema.estagio).set({ situacao: "CONCLUIDO", encerradoEm: new Date() }).where(eq(schema.estagio.id, id)));
}

async function aproveitar(mundo: Mundo, categoriaId: string, origemEstagioId: string, horas: number) {
  const documento = await createComprovanteDoEstudante(mundo.estudante.id, mundo.aluno.id);
  return cadastrarAtividade(como(mundo.aluno), {
    categoriaId,
    descricao: `Aproveitamento de estágio ${randomUUID().slice(0, 6)}`,
    instituicaoPromotora: "Concedente",
    dataInicio: "2026-08-03",
    dataFim: "2026-08-04",
    horasDeclaradasMinutos: horas * 60,
    documentoIds: [documento.id],
    origemEstagioId,
  });
}

describe("vedação de dupla contagem (RN-36)", () => {
  it("a concluded non-mandatory internship counts once, up to its homologated hours (RF046)", async () => {
    const mundo = await createMundoEstagio();
    const destino = await createCategoriaComLimite(mundo.curso.id, 100 * 60, { admiteEstagioNaoObrigatorio: true });
    const id = await estagioAtivo(mundo, naoObrigatorio);
    await concluir(mundo, id);
    await expect(aproveitar(mundo, destino.id, id, 13)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });
    await expect(aproveitar(mundo, destino.id, id, 12)).resolves.toMatchObject({ origemEstagioId: id, situacao: "EM_ANALISE" });
    // A second activity for the same internship
    await expect(aproveitar(mundo, destino.id, id, 6)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });
  });

  it("a mandatory internship never counts as complementary activity", async () => {
    const mundo = await createMundoEstagio();
    const destino = await createCategoriaComLimite(mundo.curso.id, 100 * 60, { admiteEstagioNaoObrigatorio: true });
    const id = await estagioAtivo(mundo);
    await expect(aproveitar(mundo, destino.id, id, 6)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });
  });

  it("only a finished internship of the student itself, in the category the course allows (RN-18)", async () => {
    const mundo = await createMundoEstagio();
    const destino = await createCategoriaComLimite(mundo.curso.id, 100 * 60, { admiteEstagioNaoObrigatorio: true });
    const comum = await createCategoriaComLimite(mundo.curso.id, 100 * 60);
    const ativo = await estagioAtivo(mundo, naoObrigatorio);
    await expect(aproveitar(mundo, destino.id, ativo, 6)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });

    const outro = await createMundoEstagio();
    const alheio = await estagioAtivo(outro, naoObrigatorio);
    await concluir(outro, alheio);
    await expect(aproveitar(mundo, destino.id, alheio, 6)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });

    await concluir(mundo, ativo);
    await expect(aproveitar(mundo, comum.id, ativo, 6)).rejects.toMatchObject({ code: "DUPLA_CONTAGEM_VEDADA" });
  });

  it("the type of a concluded internship never changes (so the sums stay disjoint)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo, naoObrigatorio);
    await concluir(mundo, id);
    await expect(
      withUser(como(mundo.coordenador), (tx) => tx.update(schema.estagio).set({ tipo: "OBRIGATORIO" }).where(eq(schema.estagio.id, id))).catch((error: unknown) => {
        throw traduzirErroEstagio(error, "alterar o estágio");
      }),
    ).rejects.toMatchObject({ code: "ALTERACAO_ESTAGIO_VEDADA" });
  });
});
