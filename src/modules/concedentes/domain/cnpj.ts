// RF007: CNPJ of the concedente. Since July 2026 the Receita Federal also issues
// alphanumeric CNPJs (IN RFB 2.229/2024): 12 characters in [0-9A-Z] followed by 2 numeric
// check digits. The check digits keep the module-11 rule, with each character worth its
// ASCII code minus 48 (A = 17 ... Z = 42), which also validates the old numeric CNPJs.

const FORMATO = /^[0-9A-Z]{12}[0-9]{2}$/;
const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Removes punctuation and spaces and upper-cases letters: "12.abc.345/01de-35" -> "12ABC34501DE35". */
export function normalizarCnpj(valor: string): string {
  return valor.replace(/[.\-/\s]/g, "").toUpperCase();
}

function digito(base: string, pesos: number[]): number {
  const soma = [...base].reduce((total, caractere, indice) => total + (caractere.charCodeAt(0) - 48) * pesos[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!FORMATO.test(cnpj)) return false;
  // A repeated character (00000000000000) passes the module-11 rule but is not a real CNPJ
  if (/^(.)\1{13}$/.test(cnpj)) return false;
  const primeiro = digito(cnpj.slice(0, 12), PESOS_PRIMEIRO);
  const segundo = digito(cnpj.slice(0, 12) + primeiro, PESOS_SEGUNDO);
  return cnpj.endsWith(`${primeiro}${segundo}`);
}
