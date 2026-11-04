// Issue #97: formats while typing and drops what can never be valid. Only helps: the server checks
// everything again. A CNPJ takes letters in its first 12 characters (IN RFB 2.229/2024), so a
// digits-only mask would refuse valid numbers; its last two are always digits.

export type Mascara = "cnpj" | "cep" | "telefone";

function cnpj(valor: string): string {
  const limpo = valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const raiz = limpo.slice(0, 12);
  const verificador = limpo.slice(12).replace(/\D/g, "").slice(0, 2);
  let saida = raiz.slice(0, 2);
  if (raiz.length > 2) saida += `.${raiz.slice(2, 5)}`;
  if (raiz.length > 5) saida += `.${raiz.slice(5, 8)}`;
  if (raiz.length > 8) saida += `/${raiz.slice(8, 12)}`;
  if (verificador) saida += `-${verificador}`;
  return saida;
}

function cep(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

function telefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  const meio = digitos.length > 10 ? 7 : 6;
  const fim = digitos.slice(meio);
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, meio)}${fim ? `-${fim}` : ""}`;
}

const MASCARAS: Record<Mascara, (valor: string) => string> = { cnpj, cep, telefone };

export function aplicarMascara(mascara: Mascara, valor: string): string {
  return MASCARAS[mascara](valor);
}

/** Keyboard on the phone that fits each format. */
export const TECLADO: Record<Mascara, "text" | "numeric" | "tel"> = { cnpj: "text", cep: "numeric", telefone: "tel" };
