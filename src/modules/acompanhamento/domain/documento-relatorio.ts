import { formatarData, formatarDataHora } from "@/lib/datas";
import type { DocumentoPdf, SecaoPdf } from "@/lib/pdf";
import { SITUACAO_RELATORIO } from "@/lib/rotulos";
import { partes, type IdentificacaoEstagio } from "@/modules/estagios/domain/documentos";

// RF037 to RF039: what a report says, as a document. The latest version is the report; the
// earlier ones stay as history, each with its opinion. Pure: same data, same document.

type Relatorio = { tipo: string; sequencia: number; periodoInicio: string | null; periodoFim: string | null; prazoEntrega: string; situacao: string; emAtraso: boolean };
type Parecer = { decisao: string; texto: string | null; emitidoPorNome: string | null; criadoEm: Date };
type Versao = { numero: number; conteudo: string | null; criadoEm: Date; enviadaComAtraso: boolean; anexos: { nomeOriginal: string | null }[]; parecer: Parecer | null };

const DECISAO: Record<string, string> = { APROVADO: "Aprovado", DEVOLVIDO: "Devolvido" };

export function nomeRelatorio(relatorio: Pick<Relatorio, "tipo" | "sequencia">): string {
  return relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório parcial nº ${relatorio.sequencia}`;
}

export function periodoRelatorio(relatorio: Pick<Relatorio, "periodoInicio" | "periodoFim">): string {
  return relatorio.periodoInicio ? `${formatarData(relatorio.periodoInicio)} a ${formatarData(relatorio.periodoFim)}` : `Até ${formatarData(relatorio.periodoFim)}`;
}

/** `versoes` from the latest to the first, as the repository returns them; at least one. */
export function documentoRelatorio(relatorio: Relatorio, versoes: Versao[], id: IdentificacaoEstagio): DocumentoPdf {
  const [atual, ...anteriores] = versoes;
  const secoes: SecaoPdf[] = [
    partes(id),
    {
      titulo: "Relatório",
      campos: [
        ["Período", periodoRelatorio(relatorio)],
        ["Prazo de entrega", formatarData(relatorio.prazoEntrega)],
        ["Enviado em", `${formatarDataHora(atual.criadoEm)}${atual.enviadaComAtraso ? " (fora do prazo)" : ""}`],
      ],
    },
    { titulo: "Atividades do período", paragrafos: atual.conteudo?.split(/\r?\n+/).filter((linha) => linha.trim()) ?? ["O conteúdo desta versão está nos anexos."] },
  ];
  if (atual.anexos.length > 0) secoes.push({ titulo: "Anexos", paragrafos: atual.anexos.map((anexo) => anexo.nomeOriginal ?? "Anexo sem nome") });
  secoes.push({
    titulo: "Análise do professor orientador (RF038)",
    campos: atual.parecer
      ? [
          ["Decisão", DECISAO[atual.parecer.decisao] ?? atual.parecer.decisao],
          ["Orientador", atual.parecer.emitidoPorNome ?? "Não informado"],
          ["Decidido em", formatarDataHora(atual.parecer.criadoEm)],
          ["Parecer", atual.parecer.texto ?? "Sem parecer escrito"],
        ]
      : [["Situação", "Aguardando a análise do orientador"]],
  });
  if (anteriores.length > 0) {
    secoes.push({
      titulo: "Versões anteriores (RF039)",
      campos: anteriores.map((versao) => [
        `Versão ${versao.numero}, enviada em ${formatarDataHora(versao.criadoEm)}`,
        versao.parecer ? `${DECISAO[versao.parecer.decisao] ?? versao.parecer.decisao}: ${versao.parecer.texto ?? "sem parecer escrito"}` : "Sem parecer",
      ]),
    });
  }
  return {
    titulo: nomeRelatorio(relatorio),
    subtitulo: `Relatório de estágio · versão ${atual.numero} · ${SITUACAO_RELATORIO[relatorio.situacao]?.rotulo ?? relatorio.situacao}${relatorio.emAtraso ? " · em atraso" : ""}`,
    secoes,
    rodape: `Internship Tracker · ${nomeRelatorio(relatorio)} · matrícula ${id.matricula ?? "não informada"}`,
  };
}
