// CSV for spreadsheet export (RF066). Safe against formula injection and readable by the
// spreadsheet the users actually have:
// - OWASP "CSV Injection": a cell that starts with = + - @, tab or carriage return is run
//   as a formula by Excel and LibreOffice; prefixing a single quote makes it plain text.
// - Every field is quoted and inner quotes are doubled (RFC 4180, section 2).
// - Lines end in CRLF (RFC 4180) and the file starts with a UTF-8 BOM, without which Excel
//   reads the bytes as Windows-1252 and breaks every accented character.
// - The separator is ";": Excel splits columns by the regional list separator, which is ";"
//   in pt-BR, so a comma-separated file opens as a single column there.

export const CSV_SEPARADOR = ";";
export const BOM = String.fromCharCode(0xfeff);
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

export function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '""';
  let texto = valor instanceof Date ? valor.toISOString() : typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  if (INICIO_DE_FORMULA.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  const corpo = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(CSV_SEPARADOR));
  return `${BOM}${corpo.join("\r\n")}\r\n`;
}
