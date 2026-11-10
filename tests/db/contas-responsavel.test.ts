import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { buscarContasResponsavel } from "@/modules/estagios/services/formalizacao-service";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RF031: the coordination finds the advisor and the supervisor by name. Each barrier of
// app.buscar_contas_responsavel is forced to fail on its own.

afterAll(closeOwnerDatabase);

const ids = (contas: { id: string }[]) => contas.map((conta) => conta.id);

describe("busca de responsável (RF031)", () => {
  it("finds the advisor and a supervisor of this concedente, with name and e-mail only", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "ORIENTADOR", mundo.orientador.email)).toEqual([{ id: mundo.orientador.id, nome: mundo.orientador.nome, email: mundo.orientador.email }]);
    expect(ids(await buscarContasResponsavel(como(mundo.coordenador), id, "SUPERVISOR", mundo.supervisor.nome))).toEqual([mundo.supervisor.id]);
  });

  it("leaves out a wrong profile, a supervisor of another concedente and an inactive account", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const outro = await createMundoEstagio();
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "SUPERVISOR", mundo.orientador.email)).toEqual([]);
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "ORIENTADOR", mundo.aluno.email)).toEqual([]);
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "SUPERVISOR", outro.supervisor.email)).toEqual([]);

    const inativo = await createUsuario();
    await grantPerfil(inativo.id, "PROFESSOR_ORIENTADOR");
    await owner().update(schema.usuario).set({ situacao: "INATIVO" }).where(eq(schema.usuario.id, inativo.id));
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "ORIENTADOR", inativo.email)).toEqual([]);
  });

  it("answers only to the coordination of the course of the internship", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const outro = await createMundoEstagio();
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor, mundo.representante, outro.coordenador, administrador]) {
      expect(await buscarContasResponsavel(como(pessoa), id, "ORIENTADOR", mundo.orientador.email), pessoa.email).toEqual([]);
    }
  });

  it("needs two characters and treats wildcards as text", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "ORIENTADOR", "a")).toEqual([]);
    expect(await buscarContasResponsavel(como(mundo.coordenador), id, "ORIENTADOR", "%%")).toEqual([]);
  });
});
