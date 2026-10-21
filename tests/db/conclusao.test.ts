import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { pendenciasConclusao } from "@/modules/acompanhamento/services/conclusao-service";
import { homologarFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { decidirRelatorio, enviarRelatorio, listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { traduzirErroEstagio } from "@/modules/estagios/services/erros";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// DER-LOGICO §5.2 (RF041, RF043, RF045, D3): the conclusion guards are calculated and enforced
// by the database now, so the conclusion of Fase 5 only consumes them. Each guard is observed
// on its own and the transition is refused while any remains.

afterAll(closeOwnerDatabase);

beforeAll(async () => {
  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `CONCLUSAO_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Responsabilidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});

async function codigos(mundo: Mundo, id: string) {
  return (await pendenciasConclusao(como(mundo.coordenador), id)).impedimentos.map((item) => item.code).sort();
}

/** The coordination tries the transition the way Fase 5 will (UPDATE under its own RLS). */
async function concluir(mundo: Mundo, id: string) {
  try {
    await withUser(como(mundo.coordenador), (tx) =>
      tx.update(schema.estagio).set({ situacao: "CONCLUIDO", encerradoEm: new Date() }).where(eq(schema.estagio.id, id)),
    );
  } catch (error) {
    throw traduzirErroEstagio(error, "concluir o estágio");
  }
}

async function avaliacaoFinal(mundo: Mundo, id: string) {
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
}

describe("guardas de conclusão (DER §5.2)", () => {
  it("lists every guard of a mandatory internship and refuses the conclusion until all are met", async () => {
    const mundo = await createMundoEstagio();
    await owner().update(schema.curso).set({ cargaMinimaEstagioMinutos: 360 }).where(eq(schema.curso.id, mundo.curso.id));
    const id = await estagioAtivo(mundo);
    expect(await codigos(mundo, id)).toEqual(["AVALIACAO_PENDENTE", "CARGA_MINIMA_NAO_CUMPRIDA", "RELATORIO_FINAL_PENDENTE"]);

    // D3: an entry waiting for homologation blocks on its own
    await registrarFrequencia(como(mundo.aluno), id, { data: "2026-08-03", duracaoMinutos: 360, observacao: null });
    expect(await codigos(mundo, id)).toContain("FREQUENCIA_NAO_HOMOLOGADA");
    await expect(concluir(mundo, id)).rejects.toMatchObject({
      code: "CONCLUSAO_BLOQUEADA",
      details: expect.arrayContaining([
        expect.objectContaining({ code: "FREQUENCIA_NAO_HOMOLOGADA", requisito: "RF027" }),
        expect.objectContaining({ code: "CARGA_MINIMA_NAO_CUMPRIDA", requisito: "RF045" }),
      ]),
    });

    await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-03", observacao: null });
    expect(await codigos(mundo, id)).toEqual(["AVALIACAO_PENDENTE", "RELATORIO_FINAL_PENDENTE"]);

    const final = (await listRelatorios(como(mundo.aluno), id)).find((relatorio) => relatorio.tipo === "FINAL")!;
    await enviarRelatorio(como(mundo.aluno), final.id, { conteudo: "Relatório final", documentoIds: [] });
    expect(await codigos(mundo, id)).toEqual(["AVALIACAO_PENDENTE", "RELATORIO_FINAL_PENDENTE"]);
    await decidirRelatorio(como(mundo.orientador), final.id, "APROVADO", null);
    expect(await codigos(mundo, id)).toEqual(["AVALIACAO_PENDENTE"]);
    await expect(concluir(mundo, id)).rejects.toMatchObject({ code: "CONCLUSAO_BLOQUEADA", details: [expect.objectContaining({ code: "AVALIACAO_PENDENTE" })] });

    await avaliacaoFinal(mundo, id);
    await expect(pendenciasConclusao(como(mundo.aluno), id)).resolves.toMatchObject({ podeConcluir: true, impedimentos: [] });
    await concluir(mundo, id);
    const [linha] = await owner().select().from(schema.estagio).where(eq(schema.estagio.id, id));
    expect(linha.situacao).toBe("CONCLUIDO");
  });

  it("a non-mandatory internship needs only the final evaluation and homologated hours (RN-17)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1000.00", auxilioTransporteValor: "150.00" });
    expect(await codigos(mundo, id)).toEqual(["AVALIACAO_PENDENTE"]);
    await avaliacaoFinal(mundo, id);
    await concluir(mundo, id);
  });
});
