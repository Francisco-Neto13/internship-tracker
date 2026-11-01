import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { executarRotinaDiaria } from "@/db/rotinas";
import { registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { decidirRelatorio, enviarRelatorio, listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { definirPeriodicidades } from "@/modules/academico/services/periodicidade-service";
import { substituirOrientador } from "@/modules/estagios/services/formalizacao-service";
import { lerNotificacao, lerTodas, listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { GET as rotinaDiaria } from "@/app/api/cron/diaria/route";
import { closeOwnerDatabase, createConcedente, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RF012, RF028, RF035, RF040, RF069, RF070 (DER-LOGICO §4.9): notifications only inside the
// system, by event (trigger) and by the daily routine, each read only by its recipient.

afterAll(closeOwnerDatabase);
const segredoOriginal = process.env.CRON_SECRET;
afterEach(() => {
  process.env.CRON_SECRET = segredoOriginal;
});

async function tiposDe(usuario: { id: string }) {
  return (await listNotificacoes(como(usuario), { apenasNaoLidas: false, limite: 200 })).itens.map((item) => item.tipo);
}

describe("eventos (RF028, RF035, RF070)", () => {
  it("activation notifies student, advisor, supervisor and coordination of the situation change", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor, mundo.coordenador]) {
      expect(await tiposDe(pessoa), pessoa.email).toContain("MUDANCA_SITUACAO");
    }
    expect(await tiposDe(mundo.representante)).not.toContain("MUDANCA_SITUACAO");
  });

  it("a replaced advisor notifies the student, the concedente and the new advisor (RF035)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const novo = await createUsuario();
    await grantPerfil(novo.id, "PROFESSOR_ORIENTADOR");
    await substituirOrientador(como(mundo.coordenador), id, novo.id, "Afastamento do orientador");
    for (const pessoa of [mundo.aluno, mundo.representante, novo]) {
      expect(await tiposDe(pessoa), pessoa.email).toContain("SUBSTITUICAO_RESPONSAVEL");
    }
    expect(await tiposDe(mundo.supervisor)).not.toContain("SUBSTITUICAO_RESPONSAVEL");
  });

  it("a divergence case goes to the advisor; a report decision to the student, without its content", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarFrequencia(como(mundo.aluno), id, { data: "2026-08-03", duracaoMinutos: 360, observacao: null });
    expect(await tiposDe(mundo.orientador)).toContain("DIVERGENCIA_CARGA_HORARIA");
    expect(await tiposDe(mundo.supervisor)).not.toContain("DIVERGENCIA_CARGA_HORARIA");

    const [relatorio] = await listRelatorios(como(mundo.aluno), id);
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Texto reservado do relatório", documentoIds: [] });
    await decidirRelatorio(como(mundo.orientador), relatorio.id, "DEVOLVIDO", "Parecer reservado");
    const { itens } = await listNotificacoes(como(mundo.aluno), { apenasNaoLidas: false, limite: 50 });
    const aviso = itens.find((item) => item.tipo === "RELATORIO_ANALISADO")!;
    expect(aviso.titulo).toBe("Relatório devolvido");
    expect(JSON.stringify(itens)).not.toContain("reservado");
  });
});

describe("rotina diária (RF012, RF040, RF069)", () => {
  it("warns of an agreement about to lapse, a late report and a retention period over, once each", async () => {
    // An agreement lapsing in 20 days, with no renewal
    const concedente = await createConcedente();
    const representante = await createUsuario();
    await grantPerfil(representante.id, "CONCEDENTE", { concedenteId: concedente.id });
    const [convenio] = await owner().insert(schema.convenio).values({ concedenteId: concedente.id, numero: `CV-ROT-${randomUUID().slice(0, 6)}` }).returning();
    const [documento] = await owner()
      .insert(schema.documento)
      .values({ tipo: "CONVENIO", chaveObjeto: `documentos/rotina-${randomUUID()}.pdf`, nomeOriginal: "c.pdf", tipoMime: "application/pdf", tamanhoBytes: 1, sha256: "1".repeat(64), concedenteId: concedente.id, enviadoPorUsuarioId: representante.id })
      .returning();
    const fim = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    await owner().insert(schema.convenioVigencia).values({ convenioId: convenio.id, vigenciaInicio: "2026-01-01", vigenciaFim: fim, documentoId: documento.id, registradoPorUsuarioId: representante.id });

    // A monthly report of an internship since August, overdue
    const mundo = await createMundoEstagio();
    await definirPeriodicidades(como(mundo.coordenador), mundo.curso.id, [{ tipoEstagio: "OBRIGATORIO", intervaloMeses: 1, prazoEntregaDias: 15, prazoRelatorioFinalDias: 30 }]);
    await estagioAtivo(mundo);

    // A document whose retention period is over
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    await owner().update(schema.documento).set({ dataLiberacaoGuarda: "2026-01-01" }).where(eq(schema.documento.id, documento.id));

    const primeira = await executarRotinaDiaria();
    expect(primeira.convenios_a_vencer).toBeGreaterThan(0);
    expect(primeira.relatorios).toBeGreaterThan(0);
    expect(primeira.prazo_guarda).toBeGreaterThan(0);
    expect(await tiposDe(representante)).toContain("CONVENIO_A_VENCER");
    expect(await tiposDe(mundo.coordenador)).toContain("CONVENIO_A_VENCER");
    expect(await tiposDe(mundo.aluno)).toContain("RELATORIO_ATRASADO");
    expect(await tiposDe(mundo.orientador)).toContain("RELATORIO_ATRASADO");
    expect(await tiposDe(administrador)).toContain("PRAZO_GUARDA_ATINGIDO");

    // Idempotent: a second run of the day repeats nothing
    expect(await executarRotinaDiaria()).toEqual({ convenios_a_vencer: 0, relatorios: 0, prazo_guarda: 0 });
  });

  it("the cron route answers only to the scheduler's secret", async () => {
    process.env.CRON_SECRET = "";
    expect((await rotinaDiaria(new Request("http://localhost/api/cron/diaria"))).status).toBe(401);
    process.env.CRON_SECRET = "s".repeat(40);
    expect((await rotinaDiaria(new Request("http://localhost/api/cron/diaria", { headers: { authorization: "Bearer errado" } }))).status).toBe(401);
    const resposta = await rotinaDiaria(new Request("http://localhost/api/cron/diaria", { headers: { authorization: `Bearer ${"s".repeat(40)}` } }));
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).data).toHaveProperty("relatorios");
  });
});

describe("leitura (RF070)", () => {
  it("only the recipient reads and marks as read", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const { itens, naoLidas } = await listNotificacoes(como(mundo.aluno), { apenasNaoLidas: true, limite: 50 });
    expect(naoLidas).toBeGreaterThan(0);
    await expect(lerNotificacao(como(mundo.orientador), itens[0].id)).rejects.toMatchObject({ code: "NOTIFICACAO_NAO_ENCONTRADA" });
    await expect(lerNotificacao(como(mundo.aluno), itens[0].id)).resolves.toMatchObject({ id: itens[0].id });
    await lerTodas(como(mundo.aluno));
    expect((await listNotificacoes(como(mundo.aluno), { apenasNaoLidas: true, limite: 50 })).naoLidas).toBe(0);
    const [linha] = await owner().select().from(schema.notificacao).where(and(eq(schema.notificacao.id, itens[0].id)));
    await expect(owner().update(schema.notificacao).set({ titulo: "outro" }).where(eq(schema.notificacao.id, linha.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") },
    });
  });
});
