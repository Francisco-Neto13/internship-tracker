import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/errors";
import { expiracaoSenhaProvisoria, VALIDADE_SENHA_PROVISORIA_HORAS } from "./senha-provisoria";
import {
  diferencaVinculos,
  impedirAutoinativacao,
  impedirAutorremocaoAdministrador,
  validarVinculos,
  type VinculoDesejado,
} from "./vinculos";

const CURSO = "00000000-0000-4000-8000-000000000001";

function codigosDe(fn: () => void): string[] {
  try {
    fn();
  } catch (error) {
    return ((error as DomainError).details ?? []).map((detail) => detail.code ?? "");
  }
  return [];
}

describe("validarVinculos (RF001, RN-37)", () => {
  it("accepts a coordination link with a course and an administrator link", () => {
    expect(() =>
      validarVinculos([
        { perfil: "COORDENACAO", cursoId: CURSO },
        { perfil: "ADMINISTRADOR", cursoId: null },
      ]),
    ).not.toThrow();
  });

  it("requires a course for coordination", () => {
    expect(codigosDe(() => validarVinculos([{ perfil: "COORDENACAO", cursoId: null }]))).toEqual([
      "COORDENACAO_EXIGE_CURSO",
    ]);
  });

  it("rejects a course on any other profile", () => {
    expect(codigosDe(() => validarVinculos([{ perfil: "ESTUDANTE", cursoId: CURSO }]))).toEqual([
      "CURSO_SO_PARA_COORDENACAO",
    ]);
  });

  it("holds supervisor and concedente until the concedente table exists (Fase 2)", () => {
    expect(
      codigosDe(() =>
        validarVinculos([
          { perfil: "SUPERVISOR", cursoId: null },
          { perfil: "CONCEDENTE", cursoId: null },
        ]),
      ),
    ).toEqual(["PERFIL_EXIGE_CONCEDENTE", "PERFIL_EXIGE_CONCEDENTE"]);
  });

  it("rejects the same link twice and reports every problem at once", () => {
    const codigos = codigosDe(() =>
      validarVinculos([
        { perfil: "ESTUDANTE", cursoId: null },
        { perfil: "ESTUDANTE", cursoId: null },
        { perfil: "COORDENACAO", cursoId: null },
      ]),
    );
    expect(codigos).toEqual(["PERFIL_DUPLICADO", "COORDENACAO_EXIGE_CURSO"]);
  });

  it("raises an UNPROCESSABLE domain error with a stable code", () => {
    expect(() => validarVinculos([{ perfil: "COORDENACAO", cursoId: null }])).toThrow(
      expect.objectContaining({ code: "VINCULOS_INVALIDOS", kind: "UNPROCESSABLE" }),
    );
  });
});

describe("diferencaVinculos (RF001)", () => {
  const atuais = [
    { id: "a", perfil: "ESTUDANTE", cursoId: null },
    { id: "b", perfil: "COORDENACAO", cursoId: CURSO },
  ] satisfies (VinculoDesejado & { id: string })[];

  it("keeps links that stay, closes removed ones and opens new ones", () => {
    const resultado = diferencaVinculos(atuais, [
      { perfil: "COORDENACAO", cursoId: CURSO },
      { perfil: "PROFESSOR_ORIENTADOR", cursoId: null },
    ]);

    expect(resultado.encerrar).toEqual(["a"]);
    expect(resultado.abrir).toEqual([{ perfil: "PROFESSOR_ORIENTADOR", cursoId: null }]);
  });

  it("treats coordination of another course as a different link", () => {
    const outroCurso = "00000000-0000-4000-8000-000000000002";
    const resultado = diferencaVinculos(atuais, [
      { perfil: "ESTUDANTE", cursoId: null },
      { perfil: "COORDENACAO", cursoId: outroCurso },
    ]);

    expect(resultado.encerrar).toEqual(["b"]);
    expect(resultado.abrir).toEqual([{ perfil: "COORDENACAO", cursoId: outroCurso }]);
  });

  it("changes nothing when the set is the same", () => {
    expect(
      diferencaVinculos(atuais, [
        { perfil: "COORDENACAO", cursoId: CURSO },
        { perfil: "ESTUDANTE", cursoId: null },
      ]),
    ).toEqual({ encerrar: [], abrir: [] });
  });
});

describe("administrator lock-out guards (RF001)", () => {
  it("forbids removing your own administrator profile", () => {
    expect(() => impedirAutorremocaoAdministrador("eu", "eu", [{ perfil: "ESTUDANTE", cursoId: null }])).toThrow(
      expect.objectContaining({ code: "AUTORREMOCAO_ADMINISTRADOR_VEDADA" }),
    );
  });

  it("allows removing the administrator profile of someone else", () => {
    expect(() => impedirAutorremocaoAdministrador("eu", "outro", [{ perfil: "ESTUDANTE", cursoId: null }])).not.toThrow();
  });

  it("forbids inactivating your own account", () => {
    expect(() => impedirAutoinativacao("eu", "eu")).toThrow(expect.objectContaining({ code: "AUTOINATIVACAO_VEDADA" }));
  });
});

describe("temporary password validity (RF002)", () => {
  it("expires 72 hours after it is issued", () => {
    const emitida = new Date("2026-10-20T12:00:00Z");
    expect(VALIDADE_SENHA_PROVISORIA_HORAS).toBe(72);
    expect(expiracaoSenhaProvisoria(emitida).toISOString()).toBe("2026-10-23T12:00:00.000Z");
  });
});
