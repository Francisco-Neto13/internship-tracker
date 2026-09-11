import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { estudante } from "@/db/schema";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import { createEstudante, listEstudantes } from "@/modules/academico/services/estudante-service";
import { createAccessScenario, createUsuario, grantPerfil, identityOf } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

async function visibleIds(userId: string) {
  const { items } = await listEstudantes(identityOf(userId), { page: 1, limit: 100 });
  return items.map((item) => item.id);
}

// Phase 1 exit criterion: each profile sees only what it is entitled to, proven by test
describe("estudante visibility by profile and link (RF003, RF005, RN-37)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets a student see only their own record", async () => {
    const ids = await visibleIds(s.alunoA.id);

    expect(ids).toContain(s.estudanteA.id);
    expect(ids).not.toContain(s.estudanteB.id);
    expect(ids).toHaveLength(1);
  });

  it("lets coordination see the students of the course it coordinates, and no other", async () => {
    const ids = await visibleIds(s.coordenadorA.id);

    expect(ids).toContain(s.estudanteA.id);
    expect(ids).not.toContain(s.estudanteB.id);
  });

  it("lets the administrator see students of every course", async () => {
    const ids = await visibleIds(s.administrador.id);

    expect(ids).toEqual(expect.arrayContaining([s.estudanteA.id, s.estudanteB.id]));
  });

  it("shows nothing to a user without a profile", async () => {
    expect(await visibleIds(s.semPerfil.id)).toEqual([]);
  });

  it("stops showing students once the coordination link has expired", async () => {
    const exCoordenador = await createUsuario();
    await grantPerfil(exCoordenador.id, "COORDENACAO", {
      cursoId: s.cursoA.id,
      vigenciaInicio: new Date(Date.now() - 2 * 86_400_000),
      vigenciaFim: new Date(Date.now() - 86_400_000),
    });

    expect(await visibleIds(exCoordenador.id)).toEqual([]);
  });

  it("ignores the links of an inactive user", async () => {
    const inativo = await createUsuario({ situacao: "INATIVO" });
    await grantPerfil(inativo.id, "COORDENACAO", { cursoId: s.cursoA.id });

    expect(await visibleIds(inativo.id)).toEqual([]);
  });

  it("returns the student name only where the usuario policy allows it", async () => {
    const { items } = await listEstudantes(identityOf(s.coordenadorA.id), { page: 1, limit: 100 });
    const alunoA = items.find((item) => item.id === s.estudanteA.id);

    expect(alunoA?.nome).toBe(s.alunoA.nome);
  });
});

describe("estudante writes under RLS (RF003, RF005)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets coordination register a student in its own course", async () => {
    const novo = await createUsuario();

    const created = await createEstudante(identityOf(s.coordenadorA.id), {
      usuarioId: novo.id,
      cursoId: s.cursoA.id,
      matricula: `NOVO-${novo.id.slice(0, 8)}`,
      periodo: 1,
    });

    expect(created.cursoId).toBe(s.cursoA.id);
  });

  it("refuses to let coordination register a student in another course", async () => {
    const novo = await createUsuario();

    const attempt = createEstudante(identityOf(s.coordenadorA.id), {
      usuarioId: novo.id,
      cursoId: s.cursoB.id,
      matricula: `FORA-${novo.id.slice(0, 8)}`,
      periodo: 1,
    });

    await expect(attempt).rejects.toBeInstanceOf(DomainError);
    await expect(attempt).rejects.toMatchObject({ code: "ACESSO_NEGADO", kind: "FORBIDDEN" });
  });

  it("refuses to let a student register another student", async () => {
    const novo = await createUsuario();

    await expect(
      createEstudante(identityOf(s.alunoA.id), {
        usuarioId: novo.id,
        cursoId: s.cursoA.id,
        matricula: `ALUNO-${novo.id.slice(0, 8)}`,
        periodo: 1,
      }),
    ).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("reports a duplicated matricula as a conflict", async () => {
    const novo = await createUsuario();

    await expect(
      createEstudante(identityOf(s.administrador.id), {
        usuarioId: novo.id,
        cursoId: s.cursoA.id,
        matricula: s.estudanteA.matricula,
        periodo: 1,
      }),
    ).rejects.toMatchObject({ code: "MATRICULA_DUPLICADA", kind: "CONFLICT" });
  });

  it("does not let a student change their own record", async () => {
    const updated = await withUser(identityOf(s.alunoA.id), (tx) =>
      tx.update(estudante).set({ periodo: 9 }).where(eq(estudante.id, s.estudanteA.id)).returning({ id: estudante.id }),
    );

    expect(updated).toEqual([]);
  });

  it("does not let coordination move a student into a course it does not coordinate", async () => {
    await expect(
      withUser(identityOf(s.coordenadorA.id), (tx) =>
        tx.update(estudante).set({ cursoId: s.cursoB.id }).where(eq(estudante.id, s.estudanteA.id)),
      ),
    ).rejects.toThrow();

    const { rows } = await withUser(identityOf(s.administrador.id), (tx) =>
      tx.execute<{ curso_id: string }>(sql`select curso_id from estudante where id = ${s.estudanteA.id}`),
    );
    expect(rows[0].curso_id).toBe(s.cursoA.id);
  });
});
