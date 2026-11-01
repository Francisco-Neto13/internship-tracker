import { DomainError } from "@/lib/errors";

// RF002, NIST SP 800-63B-4 3.1.1.2: the blocklist covers "context-specific words, such as
// the name of the service, the username, and derivatives thereof", and the comparison is
// on the entire password, not on substrings. A password is predictable when, ignoring
// case, accents, separators and leading or trailing digits, it is one of those words.
// Breached passwords are checked separately (Have I Been Pwned, src/lib/auth.ts).

const PALAVRAS_DO_SERVICO = ["internshiptracker", "internship", "tracker", "unima", "estagio", "estagios"];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function semDigitosNasPontas(texto: string): string {
  return texto.replace(/^\d+|\d+$/g, "");
}

export function palavrasDeContexto(usuario: { email: string; nome: string }): string[] {
  const [local, dominio = ""] = usuario.email.split("@");
  const partesNome = usuario.nome.split(/\s+/);
  return [
    ...PALAVRAS_DO_SERVICO,
    usuario.email,
    local,
    dominio.split(".")[0],
    usuario.nome,
    ...partesNome,
    // first and last name together, the usual derivative ("joaosilva")
    `${partesNome[0] ?? ""}${partesNome.at(-1) ?? ""}`,
  ]
    .map(normalizar)
    .filter((palavra) => palavra.length >= 4);
}

export function senhaPrevisivel(senha: string, usuario: { email: string; nome: string }): boolean {
  const candidata = normalizar(senha);
  const nucleo = semDigitosNasPontas(candidata);
  const palavras = new Set(palavrasDeContexto(usuario));
  // the same word repeated ("trackertracker") is a derivative as well
  const repetida = (palavra: string) => nucleo.length > 0 && nucleo.replaceAll(palavra, "") === "";
  return palavras.has(candidata) || palavras.has(nucleo) || [...palavras].some(repetida);
}

export function validarSenhaContextual(senha: string, usuario: { email: string; nome: string }): void {
  if (!senhaPrevisivel(senha, usuario)) return;
  throw new DomainError({
    code: "SENHA_PREVISIVEL",
    kind: "UNPROCESSABLE",
    message: "A nova senha não pode ser o seu nome, o seu e-mail ou o nome do sistema. Use uma frase só sua.",
    requisito: "RF002",
  });
}
