import { LIMITE } from "@/lib/campos";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatarData, formatarDataCurta } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import type { Identity } from "@/lib/identity";
import { SITUACAO_FREQUENCIA, SITUACAO_RELATORIO } from "@/lib/rotulos";
import { getCargaHoraria, listFrequencias } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import type { AcoesNoEstagio } from "@/modules/estagios/domain/papeis";
import { BaixarArquivo } from "@/shared/ui/baixar-arquivo";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { buttonVariants } from "@/shared/ui/button";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";

// M05 de um estágio ativo (RF023 a RF043): carga horária, frequência, homologação, relatórios
// e avaliações. Cada bloco mostra o que o perfil lê (RLS), e cada ação aparece só para quem a
// faz (`acoes`, de papeis.ts): estudante lança e envia, supervisor homologa, orientador analisa
// e registra o acompanhamento. A API continua decidindo cada escrita.

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

export async function AcompanhamentoEstagio({ identity, estagioId, acoes }: { identity: Identity; estagioId: string; acoes: AcoesNoEstagio }) {
  const [carga, frequencias, relatorios] = await Promise.all([
    seVisivel(getCargaHoraria(identity, estagioId)),
    seVisivel(listFrequencias(identity, estagioId, {})),
    seVisivel(listRelatorios(identity, estagioId)),
  ]);
  if (!carga) {
    return <EstadoVazio variante="sem-permissao" titulo="Acompanhamento fora do seu alcance" descricao="Frequência e relatórios são lidos por quem participa do estágio." />;
  }
  const { resumo, divergencia } = carga;
  const lancamentos = frequencias ?? [];
  const acoesFrequencia = acoes.lancarFrequencia || acoes.homologarFrequencia;

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
                <dt className="text-xs text-navy-900/65">{rotulo}</dt>
                <dd className="font-semibold text-navy-900 tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Painel>

      <div className={acoesFrequencia ? "colunas-alinhadas grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]" : "flex flex-col"}>
        <Painel titulo="Frequência" descricao={`${lancamentos.length} lançamento(s); os 30 mais recentes`} acoes={lancamentos.length > 0 && <BaixarArquivo url={`/api/v1/estagios/${estagioId}/frequencias/pdf`} rotulo="Folha (PDF)" tamanho="sm" />} flush>
          {lancamentos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-navy-900/65" data-testid="frequencias">
              Nenhum lançamento ainda.
            </p>
          ) : (
            <div tabIndex={0} className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-navy-900/10 bg-nevoa-50 text-xs text-navy-900/65">
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
                      <td className="hidden px-4 py-2.5 text-navy-900/65 md:table-cell">
                        {registro.horaEntrada ? `${registro.horaEntrada.slice(0, 5)} às ${registro.horaSaida?.slice(0, 5)}` : "Sem horário"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={SITUACAO_FREQUENCIA[registro.situacao].tom}>{SITUACAO_FREQUENCIA[registro.situacao].rotulo}</StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {acoes.cancelarFrequencia && (registro.situacao === "REGISTRADO" || registro.situacao === "SINALIZADO") && (
                          <BotaoAcao
                            url={`/api/v1/frequencias/${registro.id}/cancelamento`}
                            rotulo="Cancelar"
                            variante="ghost"
                            tamanho="sm"
                            pedirMotivo={{ campo: "justificativa", pergunta: "Motivo do cancelamento", max: LIMITE.motivoCancelamento }}
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
        {acoesFrequencia && (
        <div className="flex flex-col gap-4">
          {acoes.lancarFrequencia && (
          <Painel titulo="Registrar dia" descricao="Um lançamento por dia, até o limite diário e semanal (RF023, RF024).">
            <FormularioApi
              validacao="frequencia"
                  url={`/api/v1/estagios/${estagioId}/frequencias`}
              rotuloEnviar="Registrar dia"
              testId="registrar-frequencia"
              embutido
              sucesso="Dia registrado"
              campos={[
                { nome: "data", rotulo: "Dia", tipo: "date" },
                { nome: "horas", rotulo: "Horas no dia", tipo: "number", passo: "0.25" },
                { nome: "observacao", max: LIMITE.observacaoFrequencia, rotulo: "Observação", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
              ]}
            />
          </Painel>
          )}
          {acoes.homologarFrequencia && (
          <Painel titulo="Homologar período" descricao="Confirme os dias lançados no período (RF027).">
            <FormularioApi
              validacao="homologacao"
                  url={`/api/v1/estagios/${estagioId}/frequencias/homologacao`}
              rotuloEnviar="Homologar período"
confirmacao={{ titulo: "Homologar o período?", descricao: "Os lançamentos do período passam a contar na carga do estágio. Depois disso, só a coordenação consegue substituir um lançamento homologado.", confirmar: "Homologar" }}
              embutido
              sucesso="Período homologado"
              campos={[
                { nome: "periodo_inicio", rotulo: "De", tipo: "date" },
                { nome: "periodo_fim", rotulo: "Até", tipo: "date" },
                { nome: "observacao", max: LIMITE.parecerHomologacao, rotulo: "Parecer", tipo: "textarea", obrigatorio: false, vazioComoNulo: true },
              ]}
            />
          </Painel>
          )}
        </div>
        )}
      </div>

      {relatorios && (
        <Painel titulo="Relatórios" descricao="Periódicos e final, gerados na ativação; o atraso é calculado pelo prazo (RF036-RF041)." flush>
          <ul className="divide-y divide-navy-900/[0.07]" data-testid="relatorios">
            {relatorios.map((relatorio) => (
              <li key={relatorio.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">{relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório parcial nº ${relatorio.sequencia}`}</p>
                    <p className="text-xs text-navy-900/65">
                      {relatorio.periodoInicio ? `${formatarDataCurta(relatorio.periodoInicio)} a ${formatarDataCurta(relatorio.periodoFim)}` : `até ${formatarDataCurta(relatorio.periodoFim)}`} · prazo{" "}
                      {formatarData(relatorio.prazoEntrega)}
                    </p>
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={SITUACAO_RELATORIO[relatorio.situacao].tom}>{SITUACAO_RELATORIO[relatorio.situacao].rotulo}</StatusBadge>
                    {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
                    {relatorio.situacao !== "PENDENTE" && (
                      <Link href={`/estagios/${estagioId}/relatorios/${relatorio.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Ler relatório
                      </Link>
                    )}
                    {acoes.decidirRelatorio && relatorio.situacao === "EM_ANALISE" && (
                      <>
                        <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/aprovacao`} rotulo="Aprovar" confirmacao={{ titulo: "Aprovar o relatório?", descricao: "A aprovação é definitiva: o relatório não volta para análise e passa a contar para a conclusão do estágio.", confirmar: "Aprovar" }} variante="default" tamanho="sm" sucesso="Relatório aprovado" />
                        <BotaoAcao url={`/api/v1/relatorios/${relatorio.id}/devolucao`} rotulo="Devolver" tamanho="sm" pedirMotivo={{ campo: "parecer", pergunta: "Parecer da devolução", max: LIMITE.parecerRelatorio }} />
                      </>
                    )}
                  </span>
                </div>
                {acoes.enviarRelatorio && (relatorio.situacao === "PENDENTE" || relatorio.situacao === "DEVOLVIDO") && (
                  <details className="rounded-lg border border-navy-900/10 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Enviar relatório</summary>
                    <div className="mt-3">
                      <FormularioApi
                        validacao="relatorio"
                  url={`/api/v1/relatorios/${relatorio.id}/versoes`}
                        rotuloEnviar="Enviar relatório"
confirmacao={{ titulo: "Enviar o relatório?", descricao: "Esta versão fica registrada e vai para a análise, sem poder ser editada. Uma nova versão só pode ser enviada se o relatório for devolvido.", confirmar: "Enviar relatório" }}
                        embutido
                        sucesso="Relatório enviado ao orientador"
                        campos={[{ nome: "conteudo", max: LIMITE.conteudoRelatorio, rotulo: "Atividades do período", tipo: "textarea" }]}
                      />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </Painel>
      )}

      <div className="flex flex-col">
        {acoes.registrarAcompanhamento && (
        <Painel titulo="Acompanhamento do orientador" descricao="Visitas, contatos e reuniões (RF033).">
          <FormularioApi
            validacao="acompanhamento"
                  url={`/api/v1/estagios/${estagioId}/acompanhamentos`}
            rotuloEnviar="Registrar acompanhamento"
            embutido
            sucesso="Acompanhamento registrado"
            campos={[
              { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [{ valor: "VISITA", rotulo: "Visita" }, { valor: "CONTATO", rotulo: "Contato" }, { valor: "REUNIAO", rotulo: "Reunião" }] },
              { nome: "data_ocorrencia", rotulo: "Data", tipo: "date" },
              { nome: "participantes", max: LIMITE.participantes, rotulo: "Participantes" },
              { nome: "observacoes", max: LIMITE.observacoesAcompanhamento, rotulo: "Observações", tipo: "textarea" },
            ]}
          />
        </Painel>
        )}
      </div>
    </div>
  );
}
