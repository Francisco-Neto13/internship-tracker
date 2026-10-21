import { describe, expect, it } from "vitest";
import { senhaPrevisivel, validarSenhaContextual } from "./senha-contextual";

const MARIA = { email: "maria.souza@instituicao.edu.br", nome: "Maria Aparecida Souza" };

describe("context-specific password blocklist (RF002, NIST SP 800-63B-4)", () => {
  it.each([
    "maria.souza@instituicao.edu.br",
    "Maria.Souza2026",
    "MARIA APARECIDA SOUZA",
    "2026mariasouza!!",
    "Internship-Tracker-2026",
    "trackertrackertracker",
    "Mária Aparecída Souza 123",
  ])("rejects %j", (senha) => {
    expect(senhaPrevisivel(senha, MARIA)).toBe(true);
  });

  it.each(["correct horse battery staple", "maria gosta de cafe forte", "souza e o sobrenome dela", "uma frase longa e minha"])(
    "accepts %j, since only the entire password is compared",
    (senha) => {
      expect(senhaPrevisivel(senha, MARIA)).toBe(false);
    },
  );

  it("explains the rejection, as NIST requires", () => {
    expect(() => validarSenhaContextual("mariasouza12345", MARIA)).toThrow(
      expect.objectContaining({ code: "SENHA_PREVISIVEL", kind: "UNPROCESSABLE", message: expect.stringContaining("e-mail") }),
    );
  });
});
