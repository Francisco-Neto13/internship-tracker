import { withUser, type Transaction } from "@/db/with-user";
import { gerarCsv } from "@/lib/csv";
import { minutosParaHoras } from "@/lib/horas";
import type { Identity } from "@/lib/identity";
import { gerarPdfTabela } from "@/lib/pdf";
import type { TipoRelatorio } from "../domain/relatorios-gerenciais";
import {
  concedentesParceiras,
  estagiariosAtivos,
  pendenciasIntegralizacao,
  taxaConclusao,
  type FiltroGerencial,
  type Linha,
} from "../repositories/relatorio-gerencial-repository";

// RF067, RF068, RN-29: management reports with filters by course, period and concedente,
// shown on screen and exported to CSV or PDF from the same rows, so the three never differ.


type Coluna = { chave: string; rotulo: string; peso: number; formatar?: (valor: Linha[string]) => string | number | null };

const horas = (valor: Linha[string]) => (valor === null ? null : minutosParaHoras(Number(valor)));

const DEFINICOES: Record<TipoRelatorio, { titulo: string; buscar: (tx: Transaction, filtro: FiltroGerencial) => Promise<Linha[]>; colunas: Coluna[] }> = {
  "estagiarios-ativos": {
    titulo: "Estagiários ativos",
    buscar: estagiariosAtivos,
    colunas: [
      { chave: "curso", rotulo: "Curso", peso: 3 },
      { chave: "concedente", rotulo: "Concedente", peso: 3 },
      { chave: "tipo", rotulo: "Tipo", peso: 2 },
      { chave: "estagiarios", rotulo: "Estagiários", peso: 1 },
    ],
  },
  "concedentes-parceiras": {
    titulo: "Concedentes parceiras",
    buscar: concedentesParceiras,
    colunas: [
      { chave: "concedente", rotulo: "Concedente", peso: 4 },
      { chave: "situacao", rotulo: "Situação", peso: 1 },
      { chave: "convenios_vigentes", rotulo: "Convênios vigentes", peso: 1 },
      { chave: "estagios", rotulo: "Estágios no período", peso: 1 },
    ],
  },
  "taxa-conclusao": {
    titulo: "Taxa de conclusão",
    buscar: taxaConclusao,
    colunas: [
      { chave: "curso", rotulo: "Curso", peso: 3 },
      { chave: "concluidos", rotulo: "Concluídos", peso: 1 },
      { chave: "rescindidos", rotulo: "Rescindidos", peso: 1 },
      { chave: "taxa_conclusao_percentual", rotulo: "Taxa de conclusão (%)", peso: 1 },
    ],
  },
  "pendencias-integralizacao": {
    titulo: "Pendências de integralização",
    buscar: pendenciasIntegralizacao,
    colunas: [
      { chave: "matricula", rotulo: "Matrícula", peso: 1 },
      { chave: "nome", rotulo: "Estudante", peso: 3 },
      { chave: "curso", rotulo: "Curso", peso: 2 },
      { chave: "estagio_faltante_minutos", rotulo: "Estágio faltante (h)", peso: 1, formatar: horas },
      { chave: "atividades_faltante_minutos", rotulo: "Atividades faltantes (h)", peso: 1, formatar: horas },
    ],
  },
};

export function tituloRelatorio(tipo: TipoRelatorio): string {
  return DEFINICOES[tipo].titulo;
}

/** Rows of the report, with durations already in hours under *_horas keys (API convention). */
export async function gerarRelatorio(identity: Identity, tipo: TipoRelatorio, filtro: FiltroGerencial): Promise<Linha[]> {
  const linhas = await withUser(identity, (tx) => DEFINICOES[tipo].buscar(tx, filtro));
  return linhas.map((linha) =>
    Object.fromEntries(Object.entries(linha).map(([chave, valor]) => (chave.endsWith("_minutos") ? [chave.replace(/_minutos$/, "_horas"), horas(valor)] : [chave, valor]))),
  );
}

const descreverFiltros = (filtro: FiltroGerencial, nomes: { curso?: string; concedente?: string }): [string, string][] => [
  ["Período", `${filtro.de ?? "início"} a ${filtro.ate ?? "hoje"}`],
  ["Curso", nomes.curso ?? (filtro.cursoId ? filtro.cursoId : "todos sob seu alcance")],
  ["Concedente", nomes.concedente ?? (filtro.concedenteId ? filtro.concedenteId : "todas")],
];

/** RF068: the same rows as a CSV (src/lib/csv.ts) or a PDF table (src/lib/pdf.ts). */
export async function exportarRelatorio(identity: Identity, tipo: TipoRelatorio, filtro: FiltroGerencial, formato: "csv" | "pdf") {
  const definicao = DEFINICOES[tipo];
  const linhas = await withUser(identity, (tx) => definicao.buscar(tx, filtro));
  const valores = linhas.map((linha) => definicao.colunas.map((coluna) => (coluna.formatar ? coluna.formatar(linha[coluna.chave]) : linha[coluna.chave])));
  if (formato === "csv") return gerarCsv(definicao.colunas.map((coluna) => coluna.rotulo), valores);
  const emitido = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return gerarPdfTabela({
    titulo: definicao.titulo,
    subtitulo: `Relatório gerencial (RF067) · emitido em ${emitido}`,
    filtros: descreverFiltros(filtro, {
      curso: filtro.cursoId ? (linhas.find((linha) => linha.curso_id === filtro.cursoId)?.curso as string | undefined) : undefined,
      concedente: filtro.concedenteId ? (linhas.find((linha) => linha.concedente_id === filtro.concedenteId)?.concedente as string | undefined) : undefined,
    }),
    cabecalho: definicao.colunas.map((coluna) => coluna.rotulo),
    pesos: definicao.colunas.map((coluna) => coluna.peso),
    linhas: valores.map((linha) => linha.map((valor) => (valor === null ? "—" : typeof valor === "number" ? String(valor).replace(".", ",") : String(valor)))),
    rodape: `Internship Tracker · ${definicao.titulo}`,
  });
}
