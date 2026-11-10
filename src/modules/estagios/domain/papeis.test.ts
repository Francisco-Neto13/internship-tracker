import { describe, expect, it } from "vitest";
import { acoesNoEstagio, NENHUM_PAPEL, type PapeisNoEstagio } from "./papeis";

// Each person sees only their own part of the internship: the actions mirror the rules the
// database enforces (drizzle/sql), so the screen never offers what the API would refuse.

const como = (papel: keyof PapeisNoEstagio) => acoesNoEstagio({ ...NENHUM_PAPEL, [papel]: true });
const quem = (acao: keyof ReturnType<typeof acoesNoEstagio>) =>
  (["estudante", "orientador", "supervisor", "coordenacao", "concedente"] as const).filter((papel) => como(papel)[acao] === true);

describe("who acts on each step of the internship", () => {
  it.each([
    ["lancarFrequencia", ["estudante"]],
    ["cancelarFrequencia", ["estudante", "coordenacao"]],
    ["homologarFrequencia", ["supervisor"]],
    ["enviarRelatorio", ["estudante"]],
    ["decidirRelatorio", ["orientador"]],
    ["registrarAcompanhamento", ["orientador"]],
    ["elaborarPlano", ["estudante", "orientador", "coordenacao"]],
    ["decidirPlano", ["orientador"]],
    ["fecharTce", ["coordenacao"]],
    ["reabrirTce", ["coordenacao"]],
    ["ativar", ["coordenacao"]],
    ["vincularResponsavel", ["coordenacao"]],
    ["registrarApolice", ["coordenacao", "concedente"]],
    ["proporAditivo", ["coordenacao"]],
    ["registrarAfastamento", ["coordenacao"]],
    ["concluir", ["coordenacao"]],
    ["rescindir", ["coordenacao"]],
    ["emitirDeclaracao", ["estudante", "coordenacao"]],
  ] as const)("%s belongs to %j", (acao, papeis) => {
    expect(quem(acao)).toEqual(papeis);
  });

  it("lets each party sign only for itself (RF019)", () => {
    expect(como("estudante").partesQueAssina).toEqual(["ESTUDANTE"]);
    expect(como("coordenacao").partesQueAssina).toEqual(["INSTITUICAO"]);
    expect(como("concedente").partesQueAssina).toEqual(["CONCEDENTE"]);
    expect(como("orientador").partesQueAssina).toEqual([]);
    expect(como("supervisor").partesQueAssina).toEqual([]);
  });

  it("offers nothing to someone without a role in the internship", () => {
    const acoes = acoesNoEstagio(NENHUM_PAPEL);
    expect(Object.entries(acoes).filter(([, valor]) => valor === true)).toEqual([]);
    expect(acoes.partesQueAssina).toEqual([]);
  });

  it("adds up the roles of someone with more than one", () => {
    const acoes = acoesNoEstagio({ ...NENHUM_PAPEL, orientador: true, coordenacao: true });
    expect(acoes.decidirRelatorio && acoes.concluir).toBe(true);
    expect(acoes.lancarFrequencia).toBe(false);
  });
});
