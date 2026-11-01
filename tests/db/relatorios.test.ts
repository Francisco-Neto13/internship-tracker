import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { PERIODICIDADE_PADRAO } from "@/modules/academico/domain/periodicidade";
import { definirPeriodicidades, getPeriodicidades } from "@/modules/academico/services/periodicidade-service";
import { decidirRelatorio, enviarRelatorio, getRelatorio, listRelatorios, listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { assinarAditivo, criarAditivo } from "@/modules/estagios/services/aditivo-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF036 to RF041 (DER-LOGICO §4.5, §5.8): reports generated on activation, sent by the student
// in versions, decided by the advisor, with lateness derived from the deadline.

afterAll(closeOwnerDatabase);

const mensal = { intervaloMeses: 1, prazoEntregaDias: 15, prazoRelatorioFinalDias: 30 };

async function definirMensal(mundo: Mundo, tipoEstagio: "OBRIGATORIO" | "NAO_OBRIGATORIO" = "OBRIGATORIO") {
  await definirPeriodicidades(como(mundo.coordenador), mundo.curso.id, [{ tipoEstagio, ...mensal }]);
}

async function primeiroPeriodico(mundo: Mundo, id: string) {
  const relatorios = await listRelatorios(como(mundo.aluno), id);
  return relatorios.find((relatorio) => relatorio.tipo === "PERIODICO" && relatorio.sequencia === 1)!;
}

describe("geração na ativação (RF036, RF041, DER §5.8)", () => {
  it("creates the periodic reports of the default periodicity and the final one of a mandatory internship", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorios = await listRelatorios(como(mundo.aluno), id);
    expect(relatorios.map(({ tipo, sequencia, periodoInicio, periodoFim, prazoEntrega, situacao }) => ({ tipo, sequencia, periodoInicio, periodoFim, prazoEntrega, situacao }))).toEqual([
      { tipo: "PERIODICO", sequencia: 1, periodoInicio: "2026-08-03", periodoFim: "2027-02-02", prazoEntrega: "2027-02-17", situacao: "PENDENTE" },
      { tipo: "PERIODICO", sequencia: 2, periodoInicio: "2027-02-03", periodoFim: "2027-07-30", prazoEntrega: "2027-08-14", situacao: "PENDENTE" },
      { tipo: "FINAL", sequencia: 1, periodoInicio: "2026-08-03", periodoFim: "2027-07-30", prazoEntrega: "2027-08-29", situacao: "PENDENTE" },
    ]);
  });

  it("uses the periodicity of the course and owes no final report for a non-mandatory internship (RN-17)", async () => {
    const mundo = await createMundoEstagio();
    await definirPeriodicidades(como(mundo.coordenador), mundo.curso.id, [{ tipoEstagio: "NAO_OBRIGATORIO", intervaloMeses: 3, prazoEntregaDias: 10, prazoRelatorioFinalDias: 20 }]);
    const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1200.00", auxilioTransporteValor: "200.00" });
    const relatorios = await listRelatorios(como(mundo.aluno), id);
    expect(relatorios.map((relatorio) => relatorio.tipo)).toEqual(["PERIODICO", "PERIODICO", "PERIODICO", "PERIODICO"]);
    expect(relatorios[0]).toMatchObject({ periodoFim: "2026-11-02", prazoEntrega: "2026-11-12" });
    expect(relatorios[3]).toMatchObject({ periodoInicio: "2027-05-03", periodoFim: "2027-07-30" });
  });

  it("an extension moves only the reports still pending and adds the new periods", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const proposto = await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "Projeto estendido", novaDataFimPactuada: "2027-12-30" });
    await assinarAditivo(como(mundo.aluno), proposto.id, "ESTUDANTE", null);
    await assinarAditivo(como(mundo.representante), proposto.id, "CONCEDENTE", null);
    await assinarAditivo(como(mundo.coordenador), proposto.id, "INSTITUICAO", null);

    const relatorios = await listRelatorios(como(mundo.aluno), id);
    expect(relatorios.map(({ tipo, sequencia, periodoFim, prazoEntrega }) => ({ tipo, sequencia, periodoFim, prazoEntrega }))).toEqual([
      { tipo: "PERIODICO", sequencia: 1, periodoFim: "2027-02-02", prazoEntrega: "2027-02-17" },
      { tipo: "PERIODICO", sequencia: 2, periodoFim: "2027-08-02", prazoEntrega: "2027-08-17" },
      { tipo: "PERIODICO", sequencia: 3, periodoFim: "2027-12-30", prazoEntrega: "2028-01-14" },
      { tipo: "FINAL", sequencia: 1, periodoFim: "2027-12-30", prazoEntrega: "2028-01-29" },
    ]);
  });

  it("the default of the database matches the domain constant", async () => {
    const { rows } = await owner().execute<Record<string, number>>(
      sql`select * from app.periodicidade_de(gen_random_uuid(), 'OBRIGATORIO')`,
    );
    expect(rows[0]).toEqual({
      intervalo_meses: PERIODICIDADE_PADRAO.intervaloMeses,
      prazo_entrega_dias: PERIODICIDADE_PADRAO.prazoEntregaDias,
      prazo_relatorio_final_dias: PERIODICIDADE_PADRAO.prazoRelatorioFinalDias,
    });
  });
});

describe("periodicidade (RF036)", () => {
  it("is set by the administrator or the coordination of the course only", async () => {
    const mundo = await createMundoEstagio();
    expect((await getPeriodicidades(como(mundo.aluno), mundo.curso.id)).every((item) => item.origem === "PADRAO")).toBe(true);
    const outro = await createMundoEstagio();
    for (const pessoa of [mundo.aluno, mundo.orientador, outro.coordenador]) {
      await expect(definirPeriodicidades(como(pessoa), mundo.curso.id, [{ tipoEstagio: "OBRIGATORIO", ...mensal }])).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    await definirPeriodicidades(como(administrador), mundo.curso.id, [{ tipoEstagio: "OBRIGATORIO", ...mensal }]);
    const atualizada = await definirPeriodicidades(como(mundo.coordenador), mundo.curso.id, [{ tipoEstagio: "OBRIGATORIO", ...mensal, intervaloMeses: 2 }]);
    expect(atualizada.find((item) => item.tipoEstagio === "OBRIGATORIO")).toMatchObject({ intervaloMeses: 2, origem: "CURSO" });
  });
});

describe("envio e análise (RF037, RF038, RF039)", () => {
  it("runs send, return with opinion, resend with attachment and approval, keeping every version", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);

    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atividades do semestre", documentoIds: [] });
    await expect(enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "de novo", documentoIds: [] })).rejects.toMatchObject({ code: "RELATORIO_NAO_ENVIAVEL" });
    await expect(decidirRelatorio(como(mundo.orientador), relatorio.id, "DEVOLVIDO", null)).rejects.toMatchObject({ code: "PARECER_OBRIGATORIO" });
    await decidirRelatorio(como(mundo.orientador), relatorio.id, "DEVOLVIDO", "Detalhe as atividades de banco de dados");

    const anexo = await createDocumentoDoEstagio(id, "RELATORIO", mundo.aluno.id);
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: null, documentoIds: [anexo.id] });
    await decidirRelatorio(como(mundo.orientador), relatorio.id, "APROVADO", null);

    const { relatorio: final, versoes } = await getRelatorio(como(mundo.coordenador), relatorio.id);
    expect(final).toMatchObject({ situacao: "APROVADO" });
    expect(final.aprovadoEm).not.toBeNull();
    expect(versoes.map((versao) => [versao.numero, versao.parecer?.decisao])).toEqual([
      [2, "APROVADO"],
      [1, "DEVOLVIDO"],
    ]);
    expect(versoes[0].anexos.map((item) => item.documentoId)).toEqual([anexo.id]);
    await expect(decidirRelatorio(como(mundo.orientador), relatorio.id, "APROVADO", null)).rejects.toMatchObject({ code: "RELATORIO_NAO_ANALISAVEL" });
  });

  it("refuses an empty report, a report whose period has not started and a foreign attachment", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorios = await listRelatorios(como(mundo.aluno), id);
    await expect(enviarRelatorio(como(mundo.aluno), relatorios[0].id, { conteudo: "  ", documentoIds: [] })).rejects.toMatchObject({ code: "RELATORIO_VAZIO" });
    await expect(enviarRelatorio(como(mundo.aluno), relatorios[1].id, { conteudo: "Cedo demais", documentoIds: [] })).rejects.toMatchObject({ code: "RELATORIO_ANTECIPADO" });

    const outro = await createMundoEstagio();
    const outroId = await estagioAtivo(outro);
    const alheio = await createDocumentoDoEstagio(outroId, "RELATORIO", outro.aluno.id);
    await expect(enviarRelatorio(como(mundo.aluno), relatorios[0].id, { conteudo: null, documentoIds: [alheio.id] })).rejects.toMatchObject({ code: "DOCUMENTO_INVALIDO" });
  });

  it("the database refuses a version without text or attachment (checked at commit)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);
    await expect(
      withUser(como(mundo.aluno), (tx) => tx.insert(schema.versaoRelatorio).values({ relatorioId: relatorio.id, numero: 1, conteudo: null, enviadoPorUsuarioId: mundo.aluno.id })),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("RELATORIO_VAZIO") } });
    expect((await primeiroPeriodico(mundo, id)).situacao).toBe("PENDENTE");
  });

  it("only the student sends and only the advisor in force decides", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);
    await expect(enviarRelatorio(como(mundo.coordenador), relatorio.id, { conteudo: "x", documentoIds: [] })).rejects.toMatchObject({ code: "ENVIO_RESTRITO_AO_ESTUDANTE" });
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atividades", documentoIds: [] });
    for (const pessoa of [mundo.aluno, mundo.coordenador]) {
      await expect(decidirRelatorio(como(pessoa), relatorio.id, "APROVADO", null)).rejects.toMatchObject({ code: "ANALISE_RESTRITA_AO_ORIENTADOR" });
    }
    const outro = await createMundoEstagio();
    await expect(decidirRelatorio(como(outro.orientador), relatorio.id, "APROVADO", null)).rejects.toMatchObject({ code: "RELATORIO_NAO_ENCONTRADO" });
  });
});

describe("prazo e pendências (RF037, RF040)", () => {
  it("shows a report owed after its deadline as late, accepts it and marks the version as sent late", async () => {
    const mundo = await createMundoEstagio();
    await definirMensal(mundo);
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);
    expect(relatorio).toMatchObject({ periodoFim: "2026-09-02", prazoEntrega: "2026-09-17", emAtraso: true, pendenteDe: "ESTUDANTE" });

    const pendentesAluno = await listRelatoriosPendentes(como(mundo.aluno));
    expect(pendentesAluno.map((item) => item.id)).toContain(relatorio.id);

    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Atrasado, mas enviado", documentoIds: [] });
    const { relatorio: enviado, versoes } = await getRelatorio(como(mundo.aluno), relatorio.id);
    expect(enviado).toMatchObject({ situacao: "EM_ANALISE", emAtraso: false, pendenteDe: "ORIENTADOR" });
    expect(versoes[0].enviadaComAtraso).toBe(true);
    expect((await listRelatoriosPendentes(como(mundo.orientador))).map((item) => item.id)).toContain(relatorio.id);
  });
});

describe("visibilidade e auditoria (RN-37, RN-38)", () => {
  it("supervisor, concedente and administrator do not read reports nor download their attachments", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);
    const anexo = await createDocumentoDoEstagio(id, "RELATORIO", mundo.aluno.id);
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Conteúdo reservado", documentoIds: [anexo.id] });

    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    for (const pessoa of [mundo.supervisor, mundo.representante]) {
      await expect(listRelatorios(como(pessoa), id)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
      await expect(getRelatorio(como(pessoa), relatorio.id)).rejects.toMatchObject({ code: "RELATORIO_NAO_ENCONTRADO" });
    }
    await expect(getRelatorio(como(administrador), relatorio.id)).rejects.toMatchObject({ code: "RELATORIO_NAO_ENCONTRADO" });

    const pode = async (usuarioId: string) =>
      withUser(como({ id: usuarioId }), async (tx) => {
        const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_baixar_documento(${anexo.id}::uuid) as pode`);
        return rows[0].pode;
      });
    expect(await pode(mundo.aluno.id)).toBe(true);
    expect(await pode(mundo.orientador.id)).toBe(true);
    expect(await pode(mundo.coordenador.id)).toBe(true);
    expect(await pode(mundo.supervisor.id)).toBe(false);
    expect(await pode(mundo.representante.id)).toBe(false);
    expect(await pode(administrador.id)).toBe(false);
  });

  it("the audit trail records the flow with authors and never the text of reports or opinions", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const relatorio = await primeiroPeriodico(mundo, id);
    await enviarRelatorio(como(mundo.aluno), relatorio.id, { conteudo: "Texto confidencial do relatório", documentoIds: [] });
    await decidirRelatorio(como(mundo.orientador), relatorio.id, "DEVOLVIDO", "Parecer confidencial");
    const versoes = await owner().select({ id: schema.versaoRelatorio.id }).from(schema.versaoRelatorio).where(eq(schema.versaoRelatorio.relatorioId, relatorio.id));
    const trilha = await owner()
      .select()
      .from(schema.auditoria)
      .where(
        and(
          inArray(schema.auditoria.tabela, ["versao_relatorio", "parecer_relatorio", "relatorio"]),
          inArray(schema.auditoria.registroId, [relatorio.id, ...versoes.map((versao) => versao.id), ...(await owner().select({ id: schema.parecerRelatorio.id }).from(schema.parecerRelatorio).where(eq(schema.parecerRelatorio.versaoRelatorioId, versoes[0].id))).map((p) => p.id)]),
        ),
      );
    expect(trilha.map((linha) => linha.tabela).sort()).toEqual(["parecer_relatorio", "relatorio", "relatorio", "relatorio", "versao_relatorio"]);
    expect(JSON.stringify(trilha)).not.toContain("confidencial");
    const autores = new Set(trilha.filter((linha) => linha.tabela !== "relatorio" || linha.operacao === "UPDATE").map((linha) => linha.usuarioId));
    expect([...autores].sort()).toEqual([mundo.aluno.id, mundo.orientador.id].sort());
  });
});
