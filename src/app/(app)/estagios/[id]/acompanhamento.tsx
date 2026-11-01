import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { listAvaliacoes } from "@/modules/acompanhamento/services/avaliacao-service";
import { getCargaHoraria, listFrequencias } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

// M05 follow-up of an ATIVO internship (RF023 to RF043): hours, homologation, reports and
// evaluations. Each block shows what the caller may read (RLS); the forms call the API,
// which decides who may write. Functional screen, refined later.

const FREQUENCIA: Record<string, [string, StatusTone]> = {
  REGISTRADO: ["Registrado", "pending"],
  SINALIZADO: ["Acima do limite", "danger"],
  HOMOLOGADO: ["Homologado", "ok"],
  SUBSTITUIDO: ["Substituído", "neutral"],
  CANCELADO: ["Cancelado", "neutral"],
};
const RELATORIO: Record<string, [string, StatusTone]> = {
  PENDENTE: ["Pendente", "pending"],
  EM_ANALISE: ["Em análise", "pending"],
  DEVOLVIDO: ["Devolvido", "danger"],
  APROVADO: ["Aprovado", "ok"],
};

/** Reads that the caller's profile may not do come back as null instead of failing the page. */
async function seVisivel<T>(leitura: Promise<T>): Promise<T | null> {
  try {
    return await leitura;
  } catch (error) {
    if (error instanceof DomainError && (error.kind === "FORBIDDEN" || error.kind === "NOT_FOUND")) return null;
    throw error;
  }
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-navy-900/60">{titulo}</h2>
      {children}
    </div>
  );
}

export async function AcompanhamentoEstagio({ identity, estagioId }: { identity: Identity; estagioId: string }) {
  const [carga, frequencias, relatorios, avaliacoes] = await Promise.all([
    seVisivel(getCargaHoraria(identity, estagioId)),
    seVisivel(listFrequencias(identity, estagioId, {})),
    seVisivel(listRelatorios(identity, estagioId)),
    seVisivel(listAvaliacoes(identity, estagioId)),
  ]);
  if (!carga) return null;
  const { resumo, divergencia } = carga;

  return (
    <>
      <Bloco titulo="Carga horária">
        <dl className="surface-card grid gap-2 p-5 text-sm sm:grid-cols-4" data-testid="carga-horaria">
          {[
            ["Homologadas", `${resumo.minutosHomologados / 60} h de ${resumo.cargaTotalMinutos / 60} h`],
            ["Aguardando homologação", `${resumo.minutosPendentes / 60} h`],
            ["Conclusão", `${resumo.percentualConclusao}%`],
            ["Divergência", divergencia.avaliada ? `${divergencia.percentual ?? 0}% (tolerância ${divergencia.toleranciaPercentual}%)` : "Em avaliação"],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex flex-col">
              <dt className="text-navy-900/60">{rotulo}</dt>
              <dd className="text-navy-900">{valor}</dd>
            </div>
          ))}
        </dl>
        {divergencia.divergente && <StatusBadge tone="danger">Divergência acima da tolerância, sinalizada ao orientador</StatusBadge>}
      </Bloco>

      <Bloco titulo="Frequência">
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="frequencias">
          {(frequencias ?? []).length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhum lançamento.</li>}
          {(frequencias ?? []).slice(0, 30).map((registro) => (
            <li key={registro.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
              {registro.data} · {registro.duracaoMinutos / 60} h
              {registro.horaEntrada && ` (${registro.horaEntrada.slice(0, 5)} às ${registro.horaSaida?.slice(0, 5)})`}
              <StatusBadge tone={FREQUENCIA[registro.situacao][1]}>{FREQUENCIA[registro.situacao][0]}</StatusBadge>
              {(registro.situacao === "REGISTRADO" || registro.situacao === "SINALIZADO") && (
                <BotaoAcao url={`/api/v1/frequencias/${registro.id}/cancelamento`} rotulo="Cancelar" pedirMotivo={{ campo: "justificativa", pergunta: "Motivo do cancelamento" }} />
              )}
            </li>
          ))}
        </ul>
        <FormularioApi
          url={`/api/v1/estagios/${estagioId}/frequencias`}
          rotuloEnviar="Registrar dia"
          testId="registrar-frequencia"
          campos={[
            { nome: "data", rotulo: "Dia", tipo: "date" },
            { nome: "horas", rotulo: "Horas no dia", tipo: "number", passo: "0.25" },
            { nome: "observacao", rotulo: "Observação", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
          ]}
        />
        <FormularioApi
          url={`/api/v1/estagios/${estagioId}/frequencias/homologacao`}
          rotuloEnviar="Homologar período (supervisor)"
          campos={[
            { nome: "periodo_inicio", rotulo: "De", tipo: "date" },
            { nome: "periodo_fim", rotulo: "Até", tipo: "date" },
            { nome: "observacao", rotulo: "Parecer", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
          ]}
        />
      </Bloco>

      {relatorios && (
        <Bloco titulo="Relatórios">
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="relatorios">
            {relatorios.map((relatorio) => (
              <li key={relatorio.id} className="flex flex-col gap-3 px-5 py-3 text-navy-900">
                <div className="flex flex-wrap items-center gap-3">
                  {relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório ${relatorio.sequencia}`} · {relatorio.periodoInicio} a {relatorio.periodoFim} · prazo {relatorio.prazoEntrega}
                  <StatusBadge tone={RELATORIO[relatorio.situacao][1]}>{RELATORIO[relatorio.situacao][0]}</StatusBadge>
                  {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
                  {relatorio.situacao === "EM_ANALISE" && (
                    <>
                      <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/aprovacao`} rotulo="Aprovar (orientador)" variante="default" />
                      <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/devolucao`} rotulo="Devolver (orientador)" pedirMotivo={{ campo: "parecer", pergunta: "Parecer da devolução" }} />
                    </>
                  )}
                </div>
                {(relatorio.situacao === "PENDENTE" || relatorio.situacao === "DEVOLVIDO") && (
                  <FormularioApi
                    url={`/api/v1/relatorios/${relatorio.id}/versoes`}
                    rotuloEnviar="Enviar relatório"
                    campos={[{ nome: "conteudo", rotulo: "Atividades do período", tipo: "textarea" }]}
                  />
                )}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {avaliacoes && (
        <Bloco titulo="Avaliações de desempenho">
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="avaliacoes">
            {avaliacoes.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhuma avaliação registrada (formulário em /api/v1/estagios/{"{id}"}/avaliacao/formulario).</li>}
            {avaliacoes.map((avaliacao) => (
              <li key={avaliacao.id} className="px-5 py-3 text-navy-900">
                {avaliacao.momento === "FINAL" ? "Final" : `Periódica ${avaliacao.periodoInicio} a ${avaliacao.periodoFim}`} · média {avaliacao.media ?? "-"} de 10 · {avaliacao.avaliadorNome ?? avaliacao.avaliadorUsuarioId}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo="Acompanhamento do orientador">
        <FormularioApi
          url={`/api/v1/estagios/${estagioId}/acompanhamentos`}
          rotuloEnviar="Registrar acompanhamento"
          campos={[
            { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [{ valor: "VISITA", rotulo: "Visita" }, { valor: "CONTATO", rotulo: "Contato" }, { valor: "REUNIAO", rotulo: "Reunião" }] },
            { nome: "data_ocorrencia", rotulo: "Data", tipo: "date" },
            { nome: "participantes", rotulo: "Participantes" },
            { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
          ]}
        />
      </Bloco>
    </>
  );
}
