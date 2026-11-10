import { afterAll, describe, expect, it } from "vitest";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { closeOwnerDatabase, createMundoEstagio } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// Each person sees only their own part of the internship: the roles come from the same app.*
// functions the policies use, read per internship (perfil plus vínculo), never from the profile
// alone. A second internship of the same profiles proves the link is what counts.

afterAll(closeOwnerDatabase);

async function acoesDe(usuario: { id: string }, estagioId: string) {
  const { acoes } = await getEstagioDetalhado(como(usuario), estagioId);
  return Object.entries(acoes)
    .filter(([, valor]) => valor === true)
    .map(([acao]) => acao)
    .sort();
}

describe("ações de cada pessoa no estágio", () => {
  it("gives each role its own actions and nothing of the others", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);

    expect(await acoesDe(mundo.aluno, id)).toEqual(["cancelarFrequencia", "elaborarPlano", "emitirDeclaracao", "enviarRelatorio", "lancarFrequencia"]);
    expect(await acoesDe(mundo.orientador, id)).toEqual(["decidirPlano", "decidirRelatorio", "elaborarPlano", "registrarAcompanhamento"]);
    expect(await acoesDe(mundo.supervisor, id)).toEqual(["homologarFrequencia"]);
    expect(await acoesDe(mundo.representante, id)).toEqual(["registrarApolice"]);
    expect(await acoesDe(mundo.coordenador, id)).toEqual(
      [
        "ativar",
        "cancelarFrequencia",
        "concluir",
        "elaborarPlano",
        "emitirDeclaracao",
        "fecharTce",
        "proporAditivo",
        "reabrirTce",
        "registrarAfastamento",
        "registrarApolice",
        "rescindir",
        "vincularResponsavel",
      ].sort(),
    );
    expect((await getEstagioDetalhado(como(mundo.aluno), id)).acoes.partesQueAssina).toEqual(["ESTUDANTE"]);
    expect((await getEstagioDetalhado(como(mundo.representante), id)).acoes.partesQueAssina).toEqual(["CONCEDENTE"]);
    expect((await getEstagioDetalhado(como(mundo.coordenador), id)).acoes.partesQueAssina).toEqual(["INSTITUICAO"]);
  });

  it("the profile alone gives nothing: the same profiles in another internship do not reach this one", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const outro = await createMundoEstagio();
    await estagioAtivo(outro);
    for (const pessoa of [outro.orientador, outro.supervisor, outro.coordenador, outro.representante]) {
      await expect(getEstagioDetalhado(como(pessoa), id)).rejects.toMatchObject({ kind: "NOT_FOUND" });
    }
  });
});
