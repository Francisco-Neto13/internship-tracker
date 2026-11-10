import { describe, expect, it } from "vitest";
import { itensVisiveis, NAVEGACAO, podeAbrir } from "./navigation";

// RF003: the route guard reads the same registry as the menu, so they never disagree.

describe("podeAbrir", () => {
  it("opens every item of the menu for the profile that sees it", () => {
    for (const perfil of ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "COORDENACAO", "CONCEDENTE", "ADMINISTRADOR"] as const) {
      for (const item of itensVisiveis([perfil])) expect(podeAbrir(item.href, [perfil]), `${perfil} ${item.href}`).toBe(true);
    }
  });

  it("closes what is not on the profile's menu, also below it", () => {
    expect(podeAbrir("/administracao/usuarios", ["COORDENACAO"])).toBe(false);
    expect(podeAbrir("/administracao/usuarios/abc", ["ESTUDANTE"])).toBe(false);
    expect(podeAbrir("/administracao", ["ESTUDANTE"])).toBe(false);
    expect(podeAbrir("/frequencia", ["CONCEDENTE"])).toBe(false);
    expect(podeAbrir("/relatorios", ["SUPERVISOR"])).toBe(false);
  });

  it("the longest route decides, whatever the shorter one allows", () => {
    expect(podeAbrir("/estagios/novo", ["ESTUDANTE"])).toBe(false);
    expect(podeAbrir("/estagios/novo", ["COORDENACAO"])).toBe(true);
    expect(podeAbrir("/estagios/abc", ["ESTUDANTE"])).toBe(true);
  });

  it("lets the administrator follow a link to an internship it reads, without a menu item", () => {
    expect(NAVEGACAO.find((item) => item.href === "/estagios")?.perfis).not.toContain("ADMINISTRADOR");
    expect(podeAbrir("/estagios/abc", ["ADMINISTRADOR"])).toBe(true);
  });

  it("needs only one of the person's profiles, and no profile opens nothing restricted", () => {
    expect(podeAbrir("/administracao/usuarios", ["ESTUDANTE", "ADMINISTRADOR"])).toBe(true);
    expect(podeAbrir("/estagios", [])).toBe(false);
    expect(podeAbrir("/dashboard", [])).toBe(true);
    expect(podeAbrir("/sem-acesso", [])).toBe(true);
  });
});
