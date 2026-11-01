// Datas como a instituição as lê: calendário de America/Sao_Paulo (o mesmo de app.hoje() no
// banco), dia/mês/ano, e distâncias em palavras ("em 3 dias", "há 2 horas") onde o prazo
// importa mais que a data exata.

const FUSO = "America/Sao_Paulo";

/** AAAA-MM-DD de hoje em São Paulo. */
export function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(agora);
}

/** "03/08/2026" a partir de "2026-08-03" (data de calendário, sem fuso). */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "3 ago. 2026": curta, para listas e cabeçalhos. */
export function formatarDataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(data);
}

export function formatarDataHora(instante: Date | string | null | undefined): string {
  if (!instante) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO }).format(new Date(instante));
}

/** Dias de calendário de `de` até `ate` (negativo se já passou). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate.slice(0, 10)}T00:00:00Z`) - Date.parse(`${de.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

/** Prazo em palavras a partir de hoje: "hoje", "amanhã", "em 5 dias", "há 3 dias". */
export function prazoEmPalavras(iso: string, hoje = hojeSaoPaulo()): string {
  const dias = diasEntre(hoje, iso);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`;
}

/** Instante passado em palavras: "agora", "há 5 min", "há 3 h", "há 2 dias", depois a data. */
export function haQuantoTempo(instante: Date | string, agora = new Date()): string {
  const segundos = Math.max(0, Math.round((agora.getTime() - new Date(instante).getTime()) / 1000));
  if (segundos < 60) return "agora";
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86_400) return `há ${Math.floor(segundos / 3600)} h`;
  const dias = Math.floor(segundos / 86_400);
  if (dias < 30) return dias === 1 ? "ontem" : `há ${dias} dias`;
  return formatarDataHora(instante).split(" ")[0];
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo relógio de São Paulo. */
export function saudacao(agora = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

/** "sábado, 1 de novembro de 2026" */
export function dataPorExtenso(agora = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: FUSO }).format(agora);
}
