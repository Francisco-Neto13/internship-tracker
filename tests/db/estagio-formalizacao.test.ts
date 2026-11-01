import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { estagio as estagioTabela, estudante } from "@/db/schema";
import { updateEstudanteDados } from "@/modules/academico/services/estudante-service";
import { alterarSituacaoConcedente } from "@/modules/concedentes/services/concedente-service";
import { encerrarConvenio } from "@/modules/concedentes/services/convenio-service";
import {
  ativarEstagio,
  createEstagio,
  fecharTce,
  getEstagioDetalhado,
  listEstagios,
  reabrirTce,
  updateTce,
} from "@/modules/estagios/services/estagio-service";
import {
  assinarTce,
  decidirPlano,
  vincularResponsavel,
} from "@/modules/estagios/services/formalizacao-service";
import { como, prepararEstagio, tce, type Mundo } from "./estagio-helpers";
import { createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";

// Fase 2 exit criterion (AGENTS.md): an internship goes EM_FORMALIZACAO -> ATIVO through the
// services, under RLS, and each activation guard is proven by a test that violates it alone.

async function impedimentos(mundo: Mundo, id: string): Promise<string[]> {
  try {
    await ativarEstagio(como(mundo.coordenador), id);
    return [];
  } catch (error) {
    const { code, details } = error as { code: string; details?: { code: string }[] };
    expect(code).toBe("ATIVACAO_BLOQUEADA");
    return (details ?? []).map((detail) => detail.code);
  }
}

describe("formalization and activation (Fase 2 exit criterion)", () => {
  it("takes an internship from EM_FORMALIZACAO to ATIVO through the real flow", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);

    const ativo = await ativarEstagio(como(mundo.coordenador), id);

    expect(ativo).toMatchObject({ situacao: "ATIVO" });
    expect(ativo.ativadoEm).toBeInstanceOf(Date);
    const detalhe = await getEstagioDetalhado(como(mundo.aluno), id);
    expect(detalhe.etapas).toMatchObject({ tce: "FECHADO", partesPendentes: [] });
    expect(detalhe.assinaturas.find((a) => a.parte === "ESTUDANTE")).toMatchObject({
      signatarioUsuarioId: mundo.aluno.id,
      enderecoIp: "203.0.113.20",
      hashDocumento: ativo.hashTce,
    });
  });

  it("refuses CONCEDENTE_SUSPENSA alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    await alterarSituacaoConcedente(como(mundo.coordenador), mundo.concedente.id, "SUSPENSA", "Teste de guarda");
    expect(await impedimentos(mundo, id)).toEqual(["CONCEDENTE_SUSPENSA"]);
  });

  it("refuses CONVENIO_VENCIDO alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    await encerrarConvenio(como(mundo.coordenador), mundo.convenio.id, "Denúncia");
    expect(await impedimentos(mundo, id)).toEqual(["CONVENIO_VENCIDO"]);
  });

  it("refuses PLANO_NAO_APROVADO alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["plano"]);
    expect(await impedimentos(mundo, id)).toEqual(["PLANO_NAO_APROVADO"]);
  });

  it("refuses RESPONSAVEIS_INCOMPLETOS alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["supervisor"]);
    expect(await impedimentos(mundo, id)).toEqual(["RESPONSAVEIS_INCOMPLETOS"]);
  });

  it("refuses APOLICE_AUSENTE alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["apolice"]);
    expect(await impedimentos(mundo, id)).toEqual(["APOLICE_AUSENTE"]);
  });

  it("refuses ASSINATURAS_PENDENTES alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["assinaturaConcedente"]);
    expect(await impedimentos(mundo, id)).toEqual(["ASSINATURAS_PENDENTES"]);
  });

  it("refuses TCE_NAO_FECHADO alone", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["fechamento"]);
    expect(await impedimentos(mundo, id)).toEqual(["TCE_NAO_FECHADO"]);
  });

  it("refuses ESTUDANTE_NAO_MATRICULADO alone (D10)", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    await updateEstudanteDados(como(mundo.coordenador), mundo.estudante.id, { situacaoAcademica: "TRANCADO" });
    expect(await impedimentos(mundo, id)).toEqual(["ESTUDANTE_NAO_MATRICULADO"]);
  });

  it("refuses ESTAGIO_SIMULTANEO alone", async () => {
    const mundo = await createMundoEstagio();
    const primeiro = await prepararEstagio(mundo);
    const segundo = await prepararEstagio(mundo);
    await ativarEstagio(como(mundo.coordenador), primeiro);
    expect(await impedimentos(mundo, segundo)).toEqual(["ESTAGIO_SIMULTANEO"]);
  });
});

describe("TCE closing and reopening (D9, RF019)", () => {
  it("voids the signatures of the old content when the TCE is reopened and changed, keeping them", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    const antes = (await getEstagioDetalhado(como(mundo.coordenador), id)).estagio.hashTce;

    await reabrirTce(como(mundo.coordenador), id, "Correção da carga total");
    await updateTce(como(mundo.coordenador), id, { cargaTotalMinutos: 420 * 60 });
    await fecharTce(como(mundo.coordenador), id);

    const detalhe = await getEstagioDetalhado(como(mundo.coordenador), id);
    expect(detalhe.estagio.hashTce).not.toBe(antes);
    expect(detalhe.estagio.justificativaReabertura).toBe("Correção da carga total");
    expect(detalhe.assinaturas).toHaveLength(3);
    expect(detalhe.etapas.partesPendentes).toEqual(["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"]);
    expect(await impedimentos(mundo, id)).toEqual(["ASSINATURAS_PENDENTES"]);
  });

  it("refuses editing a closed TCE, in the service and in the database", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);

    await expect(updateTce(como(mundo.coordenador), id, { condicoesPactuadas: "outra" })).rejects.toMatchObject({ code: "TCE_FECHADO" });
    await expect(
      owner().update(estagioTabela).set({ condicoesPactuadas: "por fora" }).where(eq(estagioTabela.id, id)),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringMatching(/^ALTERACAO_ESTAGIO_VEDADA/) }) });
  });

  it("lets a party sign only for itself", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["fechamento"]);
    await fecharTce(como(mundo.coordenador), id);

    await expect(assinarTce(como(mundo.aluno), id, "INSTITUICAO", null)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await assinarTce(como(mundo.aluno), id, "ESTUDANTE", null);
    await expect(assinarTce(como(mundo.aluno), id, "ESTUDANTE", null)).rejects.toMatchObject({ code: "ASSINATURA_DUPLICADA" });
  });
});

describe("creation rules (RF008, RF010, RF044, RF062, D10)", () => {
  it("refuses a suspended concedente, an agreement not valid on the start date and an unenrolled student", async () => {
    const mundo = await createMundoEstagio();
    await expect(createEstagio(como(mundo.coordenador), tce(mundo, { dataInicio: "2031-02-01", dataFimPactuada: "2031-12-01" }))).rejects.toMatchObject({
      code: "CONVENIO_VENCIDO",
    });

    await alterarSituacaoConcedente(como(mundo.coordenador), mundo.concedente.id, "SUSPENSA", "Teste");
    await expect(createEstagio(como(mundo.coordenador), tce(mundo))).rejects.toMatchObject({ code: "CONCEDENTE_SUSPENSA" });

    const outro = await createMundoEstagio();
    await owner().update(estudante).set({ situacaoAcademica: "TRANCADO" }).where(eq(estudante.id, outro.estudante.id));
    await expect(createEstagio(como(outro.coordenador), tce(outro))).rejects.toMatchObject({ code: "ESTUDANTE_NAO_MATRICULADO" });
  });

  it("requires grant and transport aid in a non-mandatory internship and caps the duration", async () => {
    const mundo = await createMundoEstagio();
    await expect(createEstagio(como(mundo.coordenador), tce(mundo, { tipo: "NAO_OBRIGATORIO" }))).rejects.toMatchObject({
      code: "TCE_INVALIDO",
      details: expect.arrayContaining([expect.objectContaining({ code: "BOLSA_OBRIGATORIA" })]),
    });
    await expect(createEstagio(como(mundo.coordenador), tce(mundo, { dataFimPactuada: "2028-12-01" }))).rejects.toMatchObject({
      details: [expect.objectContaining({ code: "DURACAO_MAXIMA_EXCEDIDA" })],
    });
  });

  it("refuses a supervisor of another concedente and a student formalizing for someone else", async () => {
    const mundo = await createMundoEstagio();
    const criado = await createEstagio(como(mundo.coordenador), tce(mundo));
    const deOutra = await createMundoEstagio();

    await expect(vincularResponsavel(como(mundo.coordenador), criado.id, "SUPERVISOR", deOutra.supervisor.id)).rejects.toMatchObject({
      code: "PERFIL_INCOMPATIVEL",
    });
    await expect(createEstagio(como(deOutra.aluno), tce(mundo))).rejects.toMatchObject({ code: "ESTUDANTE_NAO_ENCONTRADO" });
  });

  it("lets only the advisor decide the plan", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, ["plano"]);
    await expect(decidirPlano(como(mundo.coordenador), id, "APROVADO", null)).rejects.toMatchObject({ code: "DECISAO_PLANO_RESTRITA" });
    await decidirPlano(como(mundo.orientador), id, "DEVOLVIDO", "Detalhar as atividades");
  });
});

describe("visibility of internships (RN-37)", () => {
  it("shows the internship to its people and hides it from another student and another coordination", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo);
    const estranho = await createUsuario();
    await grantPerfil(estranho.id, "ESTUDANTE");
    const outraCoordenacao = await createMundoEstagio();

    for (const quem of [mundo.aluno, mundo.coordenador, mundo.orientador, mundo.supervisor, mundo.representante]) {
      const { items } = await listEstagios(como(quem), { page: 1, limit: 50 });
      expect(items.map((item) => item.id), quem.email).toContain(id);
    }
    for (const quem of [estranho, outraCoordenacao.coordenador]) {
      const { items } = await listEstagios(como(quem), { page: 1, limit: 50 });
      expect(items.map((item) => item.id)).not.toContain(id);
    }
    const [linha] = await owner().select().from(estagioTabela).where(and(eq(estagioTabela.id, id)));
    expect(linha.cursoId).toBe(mundo.curso.id);
  });
});
