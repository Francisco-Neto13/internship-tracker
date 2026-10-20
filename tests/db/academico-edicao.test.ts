import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { curso, estudante, usuario } from "@/db/schema";
import { getCurso, updateCursoDados } from "@/modules/academico/services/curso-service";
import { getEstudante, listEstudantes, updateEstudanteDados } from "@/modules/academico/services/estudante-service";
import { createAccessScenario, createCurso, createEstudante, createUsuario, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

describe("course detail and edition (RF004)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("shows the course to any authenticated user", async () => {
    expect((await getCurso(identityOf(s.alunoA.id), s.cursoA.id)).codigo).toBe(s.cursoA.codigo);
  });

  it("answers 404 for a course that does not exist", async () => {
    await expect(getCurso(identityOf(s.administrador.id), randomUUID())).rejects.toMatchObject({
      code: "CURSO_NAO_ENCONTRADO",
    });
  });

  it("lets the administrator change name and workloads, stored in minutes", async () => {
    const alvo = await createCurso();

    const atualizado = await updateCursoDados(identityOf(s.administrador.id), alvo.id, {
      nome: "Curso Renomeado",
      cargaMinimaEstagioMinutos: 300 * 60,
    });

    expect(atualizado).toMatchObject({ nome: "Curso Renomeado", cargaMinimaEstagioMinutos: 18_000 });
    const [row] = await owner().select().from(curso).where(eq(curso.id, alvo.id));
    expect(row.cargaAtividadesComplementaresMinutos).toBe(alvo.cargaAtividadesComplementaresMinutos);
  });

  it("refuses edition by coordination, even of its own course", async () => {
    await expect(updateCursoDados(identityOf(s.coordenadorA.id), s.cursoA.id, { nome: "Outro nome" })).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
      kind: "FORBIDDEN",
    });
  });

  it("reports a repeated code as a conflict", async () => {
    const alvo = await createCurso();

    await expect(updateCursoDados(identityOf(s.administrador.id), alvo.id, { codigo: s.cursoA.codigo })).rejects.toMatchObject({
      code: "CODIGO_DUPLICADO",
    });
  });
});

describe("student detail, search and edition (RF005)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("shows the student with name and e-mail to coordination of the course", async () => {
    const detalhe = await getEstudante(identityOf(s.coordenadorA.id), s.estudanteA.id);

    expect(detalhe).toMatchObject({ matricula: s.estudanteA.matricula, email: s.alunoA.email });
  });

  it("answers 404 for a student outside the caller's scope, as for one that does not exist", async () => {
    await expect(getEstudante(identityOf(s.coordenadorA.id), s.estudanteB.id)).rejects.toMatchObject({
      code: "ESTUDANTE_NAO_ENCONTRADO",
      kind: "NOT_FOUND",
    });
    await expect(getEstudante(identityOf(s.alunoA.id), s.estudanteB.id)).rejects.toMatchObject({
      code: "ESTUDANTE_NAO_ENCONTRADO",
    });
  });

  it("filters by situation and searches matricula or name literally, inside the RLS scope", async () => {
    const marca = randomUUID().slice(0, 6);
    const pessoa = await createUsuario();
    await owner().update(usuario).set({ nome: `Aluna 100% ${marca}` }).where(eq(usuario.id, pessoa.id));
    const trancado = await createEstudante(pessoa.id, s.cursoA.id);
    await owner().update(estudante).set({ situacaoAcademica: "TRANCADO" }).where(eq(estudante.id, trancado.id));

    const porNome = await listEstudantes(identityOf(s.coordenadorA.id), { page: 1, limit: 100, busca: `100% ${marca}` });
    expect(porNome.items.map((item) => item.id)).toEqual([trancado.id]);
    expect(porNome.total).toBe(1);

    const porSituacao = await listEstudantes(identityOf(s.coordenadorA.id), { page: 1, limit: 100, situacao: "TRANCADO" });
    expect(porSituacao.items.every((item) => item.situacaoAcademica === "TRANCADO")).toBe(true);
    expect(porSituacao.items.map((item) => item.id)).toContain(trancado.id);

    const foraDoEscopo = await listEstudantes(identityOf(s.coordenadorA.id), {
      page: 1,
      limit: 100,
      busca: s.estudanteB.matricula,
    });
    expect(foraDoEscopo.items).toEqual([]);
  });

  it("lets coordination change period and situation of a student of its course", async () => {
    const pessoa = await createUsuario();
    const alvo = await createEstudante(pessoa.id, s.cursoA.id);

    const atualizado = await updateEstudanteDados(identityOf(s.coordenadorA.id), alvo.id, {
      periodo: 7,
      situacaoAcademica: "TRANCADO",
    });

    expect(atualizado).toMatchObject({ periodo: 7, situacaoAcademica: "TRANCADO", nome: pessoa.nome });
  });

  it("refuses to let coordination move a student into a course it does not coordinate", async () => {
    const pessoa = await createUsuario();
    const alvo = await createEstudante(pessoa.id, s.cursoA.id);

    await expect(
      updateEstudanteDados(identityOf(s.coordenadorA.id), alvo.id, { cursoId: s.cursoB.id }),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO" });

    const [row] = await owner().select().from(estudante).where(eq(estudante.id, alvo.id));
    expect(row.cursoId).toBe(s.cursoA.id);
  });

  it("answers 403 to a student editing their own record, and 404 for a hidden one", async () => {
    await expect(updateEstudanteDados(identityOf(s.alunoA.id), s.estudanteA.id, { periodo: 9 })).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
    await expect(updateEstudanteDados(identityOf(s.alunoA.id), s.estudanteB.id, { periodo: 9 })).rejects.toMatchObject({
      code: "ESTUDANTE_NAO_ENCONTRADO",
    });
  });

  it("reports a repeated matricula as a conflict", async () => {
    const pessoa = await createUsuario();
    const alvo = await createEstudante(pessoa.id, s.cursoA.id);

    await expect(
      updateEstudanteDados(identityOf(s.administrador.id), alvo.id, { matricula: s.estudanteB.matricula }),
    ).rejects.toMatchObject({ code: "MATRICULA_DUPLICADA" });
  });
});
