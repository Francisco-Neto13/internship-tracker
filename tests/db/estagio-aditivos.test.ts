import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { aditivo as aditivoTabela } from "@/db/schema";
import { alterarSituacaoConcedente } from "@/modules/concedentes/services/concedente-service";
import { assinarAditivo, cancelarAditivoPendente, criarAditivo, historicoTce } from "@/modules/estagios/services/aditivo-service";
import { ativarEstagio, contarEstagiosEmAndamento, getEstagioDetalhado, getHistoricoConcedente } from "@/modules/estagios/services/estagio-service";
import { substituirOrientador, vincularResponsavel } from "@/modules/estagios/services/formalizacao-service";
import { withUser } from "@/db/with-user";
import { como, prepararEstagio, type Mundo } from "./estagio-helpers";
import { createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";

// RF020, RF021, RF034, RF061, RF062 (DER §5.6, §5.7)

async function estagioAtivo() {
  const mundo = await createMundoEstagio();
  const id = await prepararEstagio(mundo);
  await ativarEstagio(como(mundo.coordenador), id);
  return { mundo, id };
}

async function assinarPelasTres(mundo: Mundo, aditivoId: string) {
  await assinarAditivo(como(mundo.aluno), aditivoId, "ESTUDANTE", null);
  await assinarAditivo(como(mundo.representante), aditivoId, "CONCEDENTE", null);
  return assinarAditivo(como(mundo.coordenador), aditivoId, "INSTITUICAO", null);
}

describe("amendments (RF020, RF021, RF061, RF062)", () => {
  it("extends the internship only after the three signatures and keeps the previous version", async () => {
    const { mundo, id } = await estagioAtivo();
    const proposto = await criarAditivo(como(mundo.coordenador), id, {
      tipo: "PRORROGACAO",
      justificativa: "Projeto estendido",
      novaDataFimPactuada: "2028-03-31",
    });
    expect(proposto).toMatchObject({ numero: 1, situacao: "AGUARDANDO_ASSINATURAS" });

    await assinarAditivo(como(mundo.aluno), proposto.id, "ESTUDANTE", null);
    expect((await getEstagioDetalhado(como(mundo.coordenador), id)).estagio.dataFimPactuada).toBe("2027-11-01");

    await assinarAditivo(como(mundo.representante), proposto.id, "CONCEDENTE", null);
    const terceira = await assinarAditivo(como(mundo.coordenador), proposto.id, "INSTITUICAO", null);
    expect(terceira.efetivado).toBe(true);

    const detalhe = await getEstagioDetalhado(como(mundo.aluno), id);
    expect(detalhe.estagio).toMatchObject({ dataFimPactuada: "2028-03-31", dataFimPrevista: "2028-03-31" });
    const versoes = await historicoTce(como(mundo.aluno), id);
    expect(versoes.map((versao) => [versao.origem, versao.valores.data_fim_pactuada])).toEqual([
      ["ADITIVO 1", "2028-03-31"],
      ["TCE", "2027-11-01"],
    ]);
  });

  it("refuses an extension beyond 2 years at the same concedente (art. 11)", async () => {
    const { mundo, id } = await estagioAtivo();
    await expect(
      criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "x", novaDataFimPactuada: "2028-11-02" }),
    ).rejects.toMatchObject({ code: "DURACAO_MAXIMA_EXCEDIDA" });
  });

  it("changes the workload within the legal limits only", async () => {
    const { mundo, id } = await estagioAtivo();
    await expect(
      criarAditivo(como(mundo.coordenador), id, { tipo: "ALTERACAO_CARGA_HORARIA", justificativa: "x", novaCargaDiariaMinutos: 8 * 60 }),
    ).rejects.toMatchObject({ code: "LIMITE_JORNADA_EXCEDIDO" });

    const proposto = await criarAditivo(como(mundo.coordenador), id, {
      tipo: "ALTERACAO_CARGA_HORARIA",
      justificativa: "Redução no semestre de provas",
      novaCargaDiariaMinutos: 4 * 60,
      novaCargaSemanalMinutos: 20 * 60,
    });
    await assinarPelasTres(mundo, proposto.id);
    expect((await getEstagioDetalhado(como(mundo.coordenador), id)).estagio).toMatchObject({
      cargaDiariaMinutos: 240,
      cargaSemanalMinutos: 1200,
    });
  });

  it("replaces the supervisor through an amendment, closing the previous period (RN-06, RN-12)", async () => {
    const { mundo, id } = await estagioAtivo();
    const novo = await createUsuario();
    await grantPerfil(novo.id, "SUPERVISOR", { concedenteId: mundo.concedente.id });

    const proposto = await criarAditivo(como(mundo.coordenador), id, {
      tipo: "SUBSTITUICAO_SUPERVISOR",
      justificativa: "Supervisor transferido",
      novoSupervisorUsuarioId: novo.id,
    });
    await assinarPelasTres(mundo, proposto.id);

    const supervisores = (await getEstagioDetalhado(como(mundo.coordenador), id)).responsaveis.filter((r) => r.papel === "SUPERVISOR");
    expect(supervisores).toHaveLength(2);
    expect(supervisores[0]).toMatchObject({ usuarioId: mundo.supervisor.id, vigenciaFim: supervisores[1].vigenciaInicio });
    expect(supervisores[1]).toMatchObject({ usuarioId: novo.id, aditivoId: proposto.id, substituiResponsavelId: supervisores[0].id });
  });

  it("keeps one pending amendment at a time and lets coordination cancel it", async () => {
    const { mundo, id } = await estagioAtivo();
    const primeiro = await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "x", novaDataFimPactuada: "2028-01-31" });
    await expect(
      criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "y", novaDataFimPactuada: "2028-02-28" }),
    ).rejects.toMatchObject({ code: "ADITIVO_PENDENTE" });

    await expect(cancelarAditivoPendente(como(mundo.aluno), primeiro.id, "não")).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    expect((await cancelarAditivoPendente(como(mundo.coordenador), primeiro.id, "Proposta substituída")).situacao).toBe("CANCELADO");
    await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "y", novaDataFimPactuada: "2028-02-28" });
  });

  it("freezes the amendment content, even for the owner", async () => {
    const { mundo, id } = await estagioAtivo();
    const proposto = await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "x", novaDataFimPactuada: "2028-01-31" });
    await expect(owner().update(aditivoTabela).set({ justificativa: "outra" }).where(eq(aditivoTabela.id, proposto.id))).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/^REGISTRO_IMUTAVEL/) }),
    });
  });

  it("refuses amendments before activation", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    await expect(
      criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "x", novaDataFimPactuada: "2028-01-31" }),
    ).rejects.toMatchObject({ code: "ESTAGIO_NAO_ATIVO" });
  });
});

describe("responsible people (RF031, RF034)", () => {
  it("replaces the advisor of an active internship with reason, keeping the history", async () => {
    const { mundo, id } = await estagioAtivo();
    const novo = await createUsuario();
    await grantPerfil(novo.id, "PROFESSOR_ORIENTADOR");

    const substituto = await substituirOrientador(como(mundo.coordenador), id, novo.id, "Afastamento do docente");

    expect(substituto).toMatchObject({ usuarioId: novo.id, motivoSubstituicao: "Afastamento do docente", decididoPorUsuarioId: mundo.coordenador.id });
    const orientadores = (await getEstagioDetalhado(como(mundo.coordenador), id)).responsaveis.filter((r) => r.papel === "ORIENTADOR");
    expect(orientadores.map((r) => r.usuarioId)).toEqual([mundo.orientador.id, novo.id]);
  });

  it("corrects a designation during formalization by annulling it, without losing the row", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["fechamento"]);
    const outro = await createUsuario();
    await grantPerfil(outro.id, "SUPERVISOR", { concedenteId: mundo.concedente.id });

    await vincularResponsavel(como(mundo.coordenador), id, "SUPERVISOR", outro.id);

    const supervisores = (await getEstagioDetalhado(como(mundo.coordenador), id)).responsaveis.filter((r) => r.papel === "SUPERVISOR");
    expect(supervisores).toHaveLength(2);
    expect(supervisores[0].vigenciaFim).toBe(supervisores[0].vigenciaInicio);
    expect(supervisores[1]).toMatchObject({ usuarioId: outro.id, vigenciaFim: null });
  });
});

describe("concedente history and suspension (RF008, RF014, RN-31)", () => {
  it("counts the internships of a concedente and preserves active ones on suspension", async () => {
    const { mundo, id } = await estagioAtivo();

    const historico = await getHistoricoConcedente(como(mundo.representante), mundo.concedente.id);
    expect(historico).toMatchObject({ total: 1, porSituacao: { ATIVO: 1 }, taxaConclusao: null });

    const suspensao = await alterarSituacaoConcedente(como(mundo.coordenador), mundo.concedente.id, "SUSPENSA", "Teste", contarEstagiosEmAndamento);
    expect(suspensao.estagiosEmAndamentoPreservados).toBe(1);
    expect((await getEstagioDetalhado(como(mundo.aluno), id)).estagio.situacao).toBe("ATIVO");
  });

  it("gives a student no access to the aggregate history", async () => {
    const { mundo } = await estagioAtivo();
    const contagem = await withUser(como(mundo.aluno), (tx) => contarEstagiosEmAndamento(tx, mundo.concedente.id));
    expect(contagem).toBe(0);
  });
});
