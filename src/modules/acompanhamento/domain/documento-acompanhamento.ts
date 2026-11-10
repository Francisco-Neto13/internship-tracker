import { formatarData, formatarDataHora } from "@/lib/datas";
import { minutosParaHoras } from "@/lib/horas";
import type { DocumentoPdf, TabelaPdf } from "@/lib/pdf";
import { SITUACAO_FREQUENCIA } from "@/lib/rotulos";
import { partes, type IdentificacaoEstagio } from "@/modules/estagios/domain/documentos";

// RF026, RF042, RF043: the performance evaluation and the attendance sheet as documents. Pure:
// the same data always yields the same document.

const horas = (minutos: number) => `${String(minutosParaHoras(minutos)).replace(".", ",")} h`;
const numero = (valor: number) => String(valor).replace(".", ",");

type Avaliacao = {
  momento: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  observacoes: string | null;
  criadoEm: Date;
  avaliadorNome?: string | null;
  media?: number | null;
  respostas: { criterioId: string; nota: number; comentario: string | null }[];
};
type Criterio = { id: string; descricao: string; escalaMinima: number; escalaMaxima: number };

export function documentoAvaliacao(avaliacao: Avaliacao, criterios: Criterio[], id: IdentificacaoEstagio): DocumentoPdf {
  const porId = new Map(criterios.map((criterio) => [criterio.id, criterio]));
  const final = avaliacao.momento === "FINAL";
  return {
    titulo: final ? "Avaliação Final de Desempenho" : "Avaliação Periódica de Desempenho",
    subtitulo: `Registrada em ${formatarDataHora(avaliacao.criadoEm)}`,
    secoes: [
      partes(id),
      {
        titulo: "Avaliação",
        campos: [
          ...(final ? [] : [["Período avaliado", `${formatarData(avaliacao.periodoInicio)} a ${formatarData(avaliacao.periodoFim)}`] as [string, string]]),
          ["Avaliador", avaliacao.avaliadorNome ?? "Não informado"],
          ["Média (0 a 10)", avaliacao.media === null || avaliacao.media === undefined ? "Sem nota" : numero(avaliacao.media)],
        ],
      },
      {
        titulo: "Notas por critério",
        campos: avaliacao.respostas.map((resposta) => {
          const criterio = porId.get(resposta.criterioId);
          const escala = criterio ? `${resposta.nota} (escala de ${criterio.escalaMinima} a ${criterio.escalaMaxima})` : String(resposta.nota);
          return [criterio?.descricao ?? "Critério", resposta.comentario ? `${escala}. ${resposta.comentario}` : escala] as [string, string];
        }),
      },
      ...(avaliacao.observacoes ? [{ titulo: "Observações", paragrafos: avaliacao.observacoes.split(/\r?\n+/).filter((linha) => linha.trim()) }] : []),
    ],
    rodape: `Internship Tracker · avaliação de desempenho · matrícula ${id.matricula ?? "não informada"}`,
  };
}

type Lancamento = { data: string; duracaoMinutos: number; horaEntrada: string | null; horaSaida: string | null; situacao: string };
type Resumo = { minutosHomologados: number; minutosPendentes: number; cargaTotalMinutos: number };

/** Only the entries in force, oldest first; replaced and cancelled ones stay on the screen history. */
export function folhaFrequencia(lancamentos: Lancamento[], resumo: Resumo, id: IdentificacaoEstagio, periodo: { dataInicio: string; dataFimPrevista: string }): TabelaPdf {
  const vigentes = lancamentos.filter((item) => item.situacao !== "SUBSTITUIDO" && item.situacao !== "CANCELADO").sort((a, b) => a.data.localeCompare(b.data));
  return {
    titulo: "Folha de Frequência",
    subtitulo: `${id.estudanteNome ?? "Estudante"} · matrícula ${id.matricula ?? "não informada"}`,
    filtros: [
      ["Concedente", id.concedente ?? "Não informada"],
      ["Curso", id.curso ?? "Não informado"],
      ["Período do estágio", `${formatarData(periodo.dataInicio)} a ${formatarData(periodo.dataFimPrevista)}`],
      ["Carga homologada", `${horas(resumo.minutosHomologados)} de ${horas(resumo.cargaTotalMinutos)}, com ${horas(resumo.minutosPendentes)} aguardando homologação`],
    ],
    cabecalho: ["Dia", "Horas", "Horário", "Situação"],
    pesos: [2, 1, 2, 3],
    linhas: vigentes.map((item) => [
      formatarData(item.data),
      horas(item.duracaoMinutos),
      item.horaEntrada ? `${item.horaEntrada.slice(0, 5)} às ${item.horaSaida?.slice(0, 5)}` : "Sem horário",
      SITUACAO_FREQUENCIA[item.situacao]?.rotulo ?? item.situacao,
    ]),
    rodape: `Internship Tracker · folha de frequência · matrícula ${id.matricula ?? "não informada"}`,
  };
}
