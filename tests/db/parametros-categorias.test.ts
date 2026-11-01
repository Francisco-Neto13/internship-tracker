import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { exigenciaCategoria, parametroInstitucional } from "@/db/schema";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { createCategoria, definirExigencias, getExigenciasCurso, updateCategoriaDados } from "@/modules/academico/services/categoria-service";
import { definirParametros, getParametrosVigentes } from "@/modules/academico/services/parametro-service";
import { createAccessScenario, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const BASE = {
  limiteDiarioObrigatorioMinutos: 360,
  limiteDiarioNaoObrigatorioMinutos: 300,
  limiteSemanalMinutos: 1800,
  bloquearExcedente: true,
  duracaoMaximaMeses: 24,
  toleranciaDivergenciaPercentual: 12.5,
  prazoGuardaAnos: 5,
  antecedenciaAlertaConvenioDias: 45,
};

/** A far-future start date no other test uses, so versions never collide. */
function dataFutura() {
  const ano = 2100 + Math.floor(Math.random() * 800);
  const dia = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${ano}-03-${dia}`;
}

describe("institutional parameters (RF006)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("falls back to the legal defaults before any version applies", async () => {
    const parametros = await getParametrosVigentes(identityOf(s.alunoA.id), "1990-01-01");
    expect(parametros).toMatchObject({ origem: "PADRAO_LEGAL", duracaoMaximaMeses: 24, limiteSemanalMinutos: 1800 });
  });

  it("records a future version that applies from its start date only", async () => {
    const inicio = dataFutura();
    await definirParametros(identityOf(s.administrador.id), { ...BASE, vigenciaInicio: inicio });

    const naData = await getParametrosVigentes(identityOf(s.coordenadorA.id), inicio);
    expect(naData).toMatchObject({ origem: "INSTITUCIONAL", vigenciaInicio: inicio, toleranciaDivergenciaPercentual: 12.5 });
    const antes = await getParametrosVigentes(identityOf(s.coordenadorA.id), "2099-12-31");
    expect(antes.vigenciaInicio).not.toBe(inicio);
  });

  it("refuses a retroactive version, in the service and in the policy", async () => {
    await expect(
      definirParametros(identityOf(s.administrador.id), { ...BASE, vigenciaInicio: "2020-01-01" }),
    ).rejects.toMatchObject({ code: "PARAMETRO_RETROATIVO" });
  });

  it("lets only the administrator define parameters", async () => {
    await expect(
      definirParametros(identityOf(s.coordenadorA.id), { ...BASE, vigenciaInicio: dataFutura() }),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("keeps every version immutable, even for the owner", async () => {
    const inicio = dataFutura();
    const versao = await definirParametros(identityOf(s.administrador.id), { ...BASE, vigenciaInicio: inicio });

    await expect(
      owner().update(parametroInstitucional).set({ duracaoMaximaMeses: 12 }).where(eq(parametroInstitucional.id, versao.id)),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringMatching(/^REGISTRO_IMUTAVEL/) }) });
  });

  it("uses today in the institution's time zone as the earliest start", () => {
    expect(dataLocal(new Date("2026-10-20T02:00:00Z"))).toBe("2026-10-19");
  });
});

describe("activity categories and course requirements (RF004, RF048)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("creates, renames and deactivates a category, never deleting it", async () => {
    const categoria = await createCategoria(identityOf(s.administrador.id), { nome: `Extensão ${randomUUID().slice(0, 6)}`, descricao: null });

    const inativa = await updateCategoriaDados(identityOf(s.administrador.id), categoria.id, { ativa: false });
    expect(inativa.ativa).toBe(false);
  });

  it("rejects a duplicate name regardless of case", async () => {
    const nome = `Pesquisa ${randomUUID().slice(0, 6)}`;
    await createCategoria(identityOf(s.administrador.id), { nome, descricao: null });

    await expect(createCategoria(identityOf(s.administrador.id), { nome: nome.toUpperCase(), descricao: null })).rejects.toMatchObject({
      code: "CATEGORIA_DUPLICADA",
    });
  });

  it("refuses category writes to coordination", async () => {
    await expect(createCategoria(identityOf(s.coordenadorA.id), { nome: `X ${randomUUID()}`, descricao: null })).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
  });

  it("sets limits per category, updates them in place and keeps one destination for internships", async () => {
    const ensino = await createCategoria(identityOf(s.administrador.id), { nome: `Ensino ${randomUUID().slice(0, 6)}`, descricao: null });
    const extensao = await createCategoria(identityOf(s.administrador.id), { nome: `Ext ${randomUUID().slice(0, 6)}`, descricao: null });

    await definirExigencias(identityOf(s.administrador.id), s.cursoA.id, [
      { categoriaId: ensino.id, limiteMinutos: 60 * 60, admiteEstagioNaoObrigatorio: true },
      { categoriaId: extensao.id, limiteMinutos: 80 * 60, admiteEstagioNaoObrigatorio: false },
    ]);
    const { categorias } = await definirExigencias(identityOf(s.administrador.id), s.cursoA.id, [
      { categoriaId: extensao.id, limiteMinutos: 90 * 60, admiteEstagioNaoObrigatorio: true },
    ]);

    expect(categorias.find((item) => item.categoriaId === ensino.id)).toMatchObject({ limiteMinutos: 3600, admiteEstagioNaoObrigatorio: false });
    expect(categorias.find((item) => item.categoriaId === extensao.id)).toMatchObject({ limiteMinutos: 5400, admiteEstagioNaoObrigatorio: true });
    const linhas = await owner().select().from(exigenciaCategoria).where(eq(exigenciaCategoria.cursoId, s.cursoA.id));
    expect(linhas.filter((linha) => linha.admiteEstagioNaoObrigatorio)).toHaveLength(1);
  });

  it("rejects two destination categories in the same request", async () => {
    await expect(
      definirExigencias(identityOf(s.administrador.id), s.cursoA.id, [
        { categoriaId: randomUUID(), limiteMinutos: 60, admiteEstagioNaoObrigatorio: true },
        { categoriaId: randomUUID(), limiteMinutos: 60, admiteEstagioNaoObrigatorio: true },
      ]),
    ).rejects.toMatchObject({ code: "DESTINO_ESTAGIO_DUPLICADO" });
  });

  it("shows the requirements of a course to any authenticated user", async () => {
    const { curso } = await getExigenciasCurso(identityOf(s.alunoA.id), s.cursoA.id);
    expect(curso.id).toBe(s.cursoA.id);
  });

  it("audits requirement changes with the administrator as author", async () => {
    const { rows } = await owner().execute<{ usuario_id: string }>(
      sql`select usuario_id from auditoria where tabela = 'exigencia_categoria' order by id desc limit 1`,
    );
    expect(rows[0].usuario_id).toBe(s.administrador.id);
  });
});
