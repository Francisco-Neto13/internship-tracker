import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { listUsuarios } from "@/modules/acesso/services/usuario-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { closeOwnerDatabase, createEstudante, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// The list screens search, sort and paginate on the server: the total counts the same rows as
// the page, an unknown sort falls back to the default, and RLS still decides what exists.

afterAll(closeOwnerDatabase);

describe("estudantes", () => {
  it("sorts both ways, pages without repeating, and names the course", async () => {
    const mundo = await createMundoEstagio();
    for (let indice = 0; indice < 2; indice += 1) {
      const conta = await createUsuario();
      await grantPerfil(conta.id, "ESTUDANTE");
      await createEstudante(conta.id, mundo.curso.id);
    }
    const consulta = { cursoId: mundo.curso.id, limit: 2 };
    const crescente = await listEstudantes(como(mundo.coordenador), { ...consulta, page: 1, ordem: "matricula" });
    const decrescente = await listEstudantes(como(mundo.coordenador), { ...consulta, page: 1, limit: 3, ordem: "-matricula" });
    expect(crescente.total).toBe(3);
    expect(crescente.items).toHaveLength(2);
    expect(crescente.items[0].cursoNome).toBe(mundo.curso.nome);
    expect(decrescente.items[0].matricula > decrescente.items[2].matricula).toBe(true);

    const segunda = await listEstudantes(como(mundo.coordenador), { ...consulta, page: 2, ordem: "matricula" });
    expect(segunda.items).toHaveLength(1);
    expect(crescente.items.map((item) => item.id)).not.toContain(segunda.items[0].id);
  });

  it("ignores an unknown sort and finds the academic profile of an account", async () => {
    const mundo = await createMundoEstagio();
    const { items } = await listEstudantes(como(mundo.coordenador), { page: 1, limit: 5, cursoId: mundo.curso.id, ordem: "senha; drop table estudante" });
    expect(items.map((item) => item.id)).toEqual([mundo.estudante.id]);
    const porConta = await listEstudantes(como(mundo.coordenador), { page: 1, limit: 5, usuarioId: mundo.aluno.id });
    expect(porConta.items.map((item) => item.id)).toEqual([mundo.estudante.id]);
  });
});

describe("estágios", () => {
  it("searches by student, enrolment and concedente, with a total that agrees", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const buscar = (busca: string) => listEstagios(como(mundo.coordenador), { page: 1, limit: 10, cursoId: mundo.curso.id, busca });
    for (const termo of [mundo.estudante.matricula, mundo.concedente.razaoSocial]) {
      const { items, total } = await buscar(termo);
      expect(items.map((item) => item.id), termo).toEqual([id]);
      expect(total, termo).toBe(1);
    }
    expect(await buscar("nenhum-resultado-possivel")).toEqual({ items: [], total: 0 });
  });

  it("the search stays inside what RLS shows", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const outro = await createMundoEstagio();
    expect(await listEstagios(como(outro.aluno), { page: 1, limit: 10, busca: mundo.estudante.matricula })).toEqual({ items: [], total: 0 });
  });
});

describe("cursos e contas", () => {
  it("counts students and active internships of a course only when asked, under RLS", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const busca = mundo.curso.codigo;
    const [comContagens] = (await listCursos(como(mundo.coordenador), { page: 1, limit: 5, busca, comContagens: true })).items;
    expect(comContagens).toMatchObject({ id: mundo.curso.id, estudantesMatriculados: 1, estagiosAtivos: 1 });
    const [semContagens] = (await listCursos(como(mundo.coordenador), { page: 1, limit: 5, busca })).items;
    expect(semContagens).toMatchObject({ estudantesMatriculados: null, estagiosAtivos: null });
    const outro = await createMundoEstagio();
    const [deFora] = (await listCursos(como(outro.coordenador), { page: 1, limit: 5, busca, comContagens: true })).items;
    expect(deFora).toMatchObject({ estudantesMatriculados: 0, estagiosAtivos: 0 });
  });

  it("sorts accounts both ways for the administrator", async () => {
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    const primeira = await listUsuarios(como(administrador), { page: 1, limit: 2, ordem: "email" });
    const ultima = await listUsuarios(como(administrador), { page: 1, limit: 2, ordem: "-email" });
    expect(primeira.total).toBe(ultima.total);
    expect(primeira.items[0].email < ultima.items[0].email).toBe(true);
  });

  it("counts pending password changes beyond the first 100 accounts (dashboard)", async () => {
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    const marca = `troca-${randomUUID()}`;
    const conta = (indice: number, trocaSenhaObrigatoria: boolean) => ({ nome: marca, email: `${marca}-${indice}@teste.local`, situacao: "ATIVO" as const, trocaSenhaObrigatoria });
    await owner()
      .insert(schema.usuario)
      .values([...Array.from({ length: 105 }, (_, indice) => conta(indice, true)), conta(105, false)]);
    const consulta = { page: 1, limit: 1, situacao: "ATIVO" as const, busca: marca };
    const pendentes = await listUsuarios(como(administrador), { ...consulta, trocaSenhaPendente: true });
    expect(pendentes.total).toBe(105);
    expect(pendentes.items).toHaveLength(1);
    expect((await listUsuarios(como(administrador), consulta)).total).toBe(106);
  });
});
