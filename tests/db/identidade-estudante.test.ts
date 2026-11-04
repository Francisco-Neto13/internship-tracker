import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { buscarContasEstudante } from "@/modules/acesso/services/usuario-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { closeOwnerDatabase, createEstudante, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// Issue #80: who follows an internship reads name and enrolment of its student, and nothing else;
// coordination finds accounts by name when registering a student. Each barrier is forced to fail.

afterAll(closeOwnerDatabase);

describe("identidade do estudante no estágio", () => {
  it("advisor, supervisor and concedente read name and enrolment of their own internship", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const pessoa of [mundo.orientador, mundo.supervisor, mundo.representante]) {
      const { items } = await listEstagios(como(pessoa), { page: 1, limit: 10 });
      expect(items.find((item) => item.id === id), pessoa.email).toMatchObject({ estudanteNome: mundo.aluno.nome, matricula: mundo.estudante.matricula });
    }
  });

  it("they find and sort the internship by the student, and the total agrees", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const busca of [mundo.aluno.nome, mundo.estudante.matricula]) {
      const achados = await listEstagios(como(mundo.supervisor), { page: 1, limit: 10, busca });
      expect(achados.items.map((item) => item.id), busca).toEqual([id]);
      expect(achados.total, busca).toBe(1);
    }
    const ordenados = await listEstagios(como(mundo.supervisor), { page: 1, limit: 10, ordem: "-estudante" });
    expect(ordenados.items.map((item) => item.id)).toContain(id);
  });

  it("the advisor reads the name in the list of pending reports", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const pendentes = await listRelatoriosPendentes(como(mundo.orientador));
    for (const relatorio of pendentes) expect(relatorio.estudanteNome).toBe(mundo.aluno.nome);
  });

  it("the function hands over only the two columns and only the students followed", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const outro = await createMundoEstagio();
    const ler = (pessoa: { id: string; email: string }) =>
      withUser(como(pessoa), async (tx) => (await tx.execute<Record<string, unknown>>(sql`select * from app.identidades_estudante()`)).rows);

    expect(await ler(mundo.supervisor)).toEqual([{ estudante_id: mundo.estudante.id, nome: mundo.aluno.nome, matricula: mundo.estudante.matricula }]);
    expect(await ler(outro.supervisor)).toEqual([]);
    expect(await ler(outro.orientador)).toEqual([]);
    expect(await ler(outro.representante)).toEqual([]);
  });

  it("the rest of the student stays closed: no e-mail, no academic record", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    for (const pessoa of [mundo.orientador, mundo.supervisor, mundo.representante]) {
      const [contas, academicos] = await withUser(como(pessoa), async (tx) => [
        await tx.select().from(schema.usuario).where(eq(schema.usuario.id, mundo.aluno.id)),
        await tx.select().from(schema.estudante).where(eq(schema.estudante.id, mundo.estudante.id)),
      ]);
      expect(contas, pessoa.email).toEqual([]);
      expect(academicos, pessoa.email).toEqual([]);
    }
  });

  it("the responsible person loses it when the link ends", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await owner()
      .update(schema.responsavelEstagio)
      .set({ vigenciaFim: sql`current_date` })
      .where(and(eq(schema.responsavelEstagio.estagioId, id), eq(schema.responsavelEstagio.usuarioId, mundo.supervisor.id)));
    const identidades = await withUser(como(mundo.supervisor), async (tx) => (await tx.execute(sql`select * from app.identidades_estudante()`)).rows);
    expect(identidades).toEqual([]);
    expect(await listEstagios(como(mundo.supervisor), { page: 1, limit: 10 })).toEqual({ items: [], total: 0 });
  });
});

describe("busca de contas ao cadastrar estudante (RF005)", () => {
  async function conta(marca: string, perfil: "ESTUDANTE" | "PROFESSOR_ORIENTADOR" = "ESTUDANTE", situacao: "ATIVO" | "INATIVO" = "ATIVO") {
    const usuario = await createUsuario({ situacao });
    const [renomeado] = await owner().update(schema.usuario).set({ nome: `${marca} ${usuario.id}` }).where(eq(schema.usuario.id, usuario.id)).returning();
    await grantPerfil(usuario.id, perfil);
    return renomeado;
  }

  it("coordination and administrator find an active student account without academic record", async () => {
    const mundo = await createMundoEstagio();
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    const marca = `busca${randomUUID().slice(0, 8)}`;
    const livre = await conta(marca);
    for (const pessoa of [mundo.coordenador, administrador]) {
      expect(await buscarContasEstudante(como(pessoa), marca), pessoa.email).toEqual([{ id: livre.id, nome: livre.nome, email: livre.email }]);
    }
  });

  it("leaves out accounts already enrolled, inactive or of another profile", async () => {
    const mundo = await createMundoEstagio();
    const marca = `fora${randomUUID().slice(0, 8)}`;
    const matriculada = await conta(marca);
    await createEstudante(matriculada.id, mundo.curso.id);
    await conta(marca, "ESTUDANTE", "INATIVO");
    await conta(marca, "PROFESSOR_ORIENTADOR");
    expect(await buscarContasEstudante(como(mundo.coordenador), marca)).toEqual([]);
  });

  it("no other profile finds anything", async () => {
    const mundo = await createMundoEstagio();
    const marca = `perfil${randomUUID().slice(0, 8)}`;
    await conta(marca);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor, mundo.representante]) {
      expect(await buscarContasEstudante(como(pessoa), marca), pessoa.email).toEqual([]);
    }
  });

  it("takes the text literally and needs two characters, so nobody lists every account", async () => {
    const mundo = await createMundoEstagio();
    const marca = `literal${randomUUID().slice(0, 8)}`;
    await conta(marca);
    for (const busca of ["%%", "__", "%", "a", "  "]) {
      expect(await buscarContasEstudante(como(mundo.coordenador), busca), busca).toEqual([]);
    }
  });
});
