/**
 * ILIKE pattern that matches `texto` literally anywhere in the value. LIKE treats %, _ and
 * the escape character as wildcards; escaping them makes a search for "50%" match that
 * text only (PostgreSQL's default LIKE escape character is the backslash).
 */
export function padraoContendo(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)}%`;
}
