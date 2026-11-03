import { AlertTriangle } from "lucide-react";
import { formatarData, formatarDataCurta } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import type { Identity } from "@/lib/identity";
import { SITUACAO_RELATORIO } from "@/lib/rotulos";
import { listAvaliacoes } from "@/modules/acompanhamento/services/avaliacao-service";
import { getCargaHoraria, listFrequencias } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

// M05 de um estágio ativo (RF023 a RF043): carga horária, frequência, homologação, relatórios
// e avaliações. Cada bloco mostra o que o perfil lê (RLS); os formulários chamam a API, que
// decide quem escreve (estudante lança, supervisor homologa, orientador analisa).

const FREQUENCIA: Record<string, [string, StatusTone]> = {
  REGISTRADO: ["Aguardando homologação", "pending"],
  SINALIZADO: ["Acima do limite", "danger"],
  HOMOLOGADO: ["Homologado", "ok"],
  SUBSTITUIDO: ["Substituído", "neutral"],
  CANCELADO: ["Cancelado", "neutral"],
};

const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;

/** Leituras que o perfil não faz voltam null em vez de derrubar a página. */
async function seVisivel<T>(leitura: Promise<T>): Promise<T | null> {
  try {
    return await leitura;
  } catch (error) {
    if (error instanceof DomainError && (error.kind === "FORBIDDEN" || error.kind === "NOT_FOUND")) return null;
    throw error;
  }
}

export async function AcompanhamentoEstagio({ identity, estagioId }: { identity: Identity; estagioId: string }) {
  const [carga, frequencias, relatorios, avaliacoes] = await Promise.all([
    seVisivel(getCargaHoraria(identity, estagioId)),
    seVisivel(listFrequencias(identity, estagioId, {})),
    seVisivel(listRelatorios(identity, estagioId)),
    seVisivel(listAvaliacoes(identity, estagioId)),
  ]);
  if (!carga) {
    return <EstadoVazio variante="sem-permissao" titulo="Acompanhamento fora do seu alcance" descricao="Frequência, relatórios e avaliações são lidos por quem participa do estágio." />;
  }
  const { resumo, divergencia } = carga;
  const lancamentos = frequencias ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Painel titulo="Carga horária" descricao="Só a carga homologada pelo supervisor conta (RF026).">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]" data-testid="carga-horaria">
          <div className="flex flex-col gap-4">
            <Progresso
              rotulo="Homologadas"
              atual={minutosParaHoras(resumo.minutosHomologados)}
              total={minutosParaHoras(resumo.cargaTotalMinutos)}
              formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
              detalhe={`Saldo de ${h(resumo.saldoMinutos)} para completar a carga do TCE`}
            />
            {divergencia.divergente && (
              <p className="flex items-start gap-2 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger-text">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                Divergência acima da tolerância, sinalizada ao orientador: {h(divergencia.minutosCumpridos)} cumpridas para {h(divergencia.minutosPrevistos)} previstas até{" "}
                {formatarData(divergencia.dataReferencia)}.
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Aguardando homologação", h(resumo.minutosPendentes)],
              ["Conclusão", `${resumo.percentualConclusao.toLocaleString("pt-BR")}%`],
              ["Divergência", divergencia.avaliada ? `${(divergencia.percentual ?? 0).toLocaleString("pt-BR")}%` : "Em avaliação"],
              ["Tolerância", `${divergencia.toleranciaPercentual.toLocaleString("pt-BR")}%`],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-lg bg-nevoa-50 px-3 py-2">
                <dt className="text-xs text-navy-900/60">{rotulo}</dt>
                <dd className="font-semibold text-navy-900 tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Painel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Painel titulo="Frequência" descricao={`${lancamentos.length} lançamento(s); os 30 mais recentes`} flush>
          {lancamentos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-900/60" data-testid="frequencias">
              Nenhum lançamento ainda.
            </p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-navy-900/10 bg-nevoa-50 text-xs text-navy-900/60">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Dia
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      Horas
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                      Horário
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Situação
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody data-testid="frequencias">
                  {lancamentos.slice(0, 30).map((registro) => (
                    <tr key={registro.id} className="border-b border-navy-900/[0.07] last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-navy-900">{formatarDataCurta(registro.data)}</td>
                      <td className="px-4 py-2.5 text-right text-navy-900 tabular-nums">{h(registro.duracaoMinutos)}</td>
                      <td className="hidden px-4 py-2.5 text-navy-900/60 md:table-cell">
                        {registro.horaEntrada ? `${registro.horaEntrada.slice(0, 5)} às ${registro.horaSaida?.slice(0, 5)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={FREQUENCIA[registro.situacao][1]}>{FREQUENCIA[registro.situacao][0]}</StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(registro.situacao === "REGISTRADO" || registro.situacao === "SINALIZADO") && (
                          <BotaoAcao
                            url={`/api/v1/frequencias/${registro.id}/cancelamento`}
                            rotulo="Cancelar"
                            variante="ghost"
                            tamanho="sm"
                            pedirMotivo={{ campo: "justificativa", pergunta: "Motivo do cancelamento" }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
        <div className="flex flex-col gap-4">
          <Painel titulo="Registrar dia" descricao="Estudante: um lançamento por dia, até o limite diário e semanal (RF023, RF024).">
            <FormularioApi
              url={`/api/v1/estagios/${estagioId}/frequencias`}
              rotuloEnviar="Registrar dia"
              testId="registrar-frequencia"
              embutido
              sucesso="Dia registrado"
              campos={[
                { nome: "data", rotulo: "Dia", tipo: "date" },
                { nome: "horas", rotulo: "Horas no dia", tipo: "number", passo: "0.25" },
                { nome: "observacao", rotulo: "Observação", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
              ]}
            />
          </Painel>
          <Painel titulo="Homologar período" descricao="Supervisor: confirma os dias lançados no período (RF027).">
            <FormularioApi
              url={`/api/v1/estagios/${estagioId}/frequencias/homologacao`}
              rotuloEnviar="Homologar período"
              embutido
              sucesso="Período homologado"
              campos={[
                { nome: "periodo_inicio", rotulo: "De", tipo: "date" },
                { nome: "periodo_fim", rotulo: "Até", tipo: "date" },
                { nome: "observacao", rotulo: "Parecer", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
              ]}
            />
          </Painel>
        </div>
      </div>

      {relatorios && (
        <Painel titulo="Relatórios" descricao="Periódicos e final, gerados na ativação; o atraso é calculado pelo prazo (RF036-RF041)." flush>
          <ul className="divide-y divide-navy-900/[0.07]" data-testid="relatorios">
            {relatorios.map((relatorio) => (
              <li key={relatorio.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">{relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório parcial nº ${relatorio.sequencia}`}</p>
                    <p className="text-xs text-navy-900/60">
                      {relatorio.periodoInicio ? `${formatarDataCurta(relatorio.periodoInicio)} a ${formatarDataCurta(relatorio.periodoFim)}` : `até ${formatarDataCurta(relatorio.periodoFim)}`} · prazo{" "}
                      {formatarData(relatorio.prazoEntrega)}
                    </p>
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={SITUACAO_RELATORIO[relatorio.situacao].tom}>{SITUACAO_RELATORIO[relatorio.situacao].rotulo}</StatusBadge>
                    {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
                    {relatorio.situacao === "EM_ANALISE" && (
                      <>
                        <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/aprovacao`} rotulo="Aprovar" variante="default" tamanho="sm" sucesso="Relatório aprovado" />
                        <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/devolucao`} rotulo="Devolver" tamanho="sm" pedirMotivo={{ campo: "parecer", pergunta: "Parecer da devolução" }} />
                      </>
                    )}
                  </span>
                </div>
                {(relatorio.situacao === "PENDENTE" || relatorio.situacao === "DEVOLVIDO") && (
                  <details className="rounded-lg border border-navy-900/10 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Enviar relatório</summary>
                    <div className="mt-3">
                      <FormularioApi
                        url={`/api/v1/relatorios/${relatorio.id}/versoes`}
                        rotuloEnviar="Enviar relatório"
                        embutido
                        sucesso="Relatório enviado ao orientador"
                        campos={[{ nome: "conteudo", rotulo: "Atividades do período", tipo: "textarea" }]}
                      />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </Painel>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {avaliacoes && (
          <Painel titulo="Avaliações de desempenho" descricao="Pela concedente, por critério (RF042, RF043)." flush>
            <ul className="divide-y divide-navy-900/[0.07]" data-testid="avaliacoes">
              {avaliacoes.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/60">Nenhuma avaliação registrada.</li>}
              {avaliacoes.map((avaliacao) => (
                <li key={avaliacao.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="block font-medium text-navy-900">
                      {avaliacao.momento === "FINAL" ? "Avaliação final" : `Periódica · ${formatarDataCurta(avaliacao.periodoInicio)} a ${formatarDataCurta(avaliacao.periodoFim)}`}
                    </span>
                    <span className="block text-xs text-navy-900/60">{avaliacao.avaliadorNome ?? "Avaliador"}</span>
                  </span>
                  <span className="text-lg font-semibold text-navy-900 tabular-nums">
                    {avaliacao.media ?? "—"}
                    <span className="text-xs font-normal text-navy-900/60"> / 10</span>
                  </span>
                </li>
              ))}
            </ul>
          </Painel>
        )}
        <Painel titulo="Acompanhamento do orientador" descricao="Visitas, contatos e reuniões (RF033).">
          <FormularioApi
            url={`/api/v1/estagios/${estagioId}/acompanhamentos`}
            rotuloEnviar="Registrar acompanhamento"
            embutido
            sucesso="Acompanhamento registrado"
            campos={[
              { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [{ valor: "VISITA", rotulo: "Visita" }, { valor: "CONTATO", rotulo: "Contato" }, { valor: "REUNIAO", rotulo: "Reunião" }] },
              { nome: "data_ocorrencia", rotulo: "Data", tipo: "date" },
              { nome: "participantes", rotulo: "Participantes" },
              { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
            ]}
          />
        </Painel>
      </div>
    </div>
  );
}
