import { FileDown } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { diasEntre, formatarData, formatarDataCurta, hojeSaoPaulo } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import { SITUACAO_ESTAGIO, TIPO_ESTAGIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { Abas } from "@/shared/ui/abas";
import { Avatar } from "@/shared/ui/avatar";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { AcompanhamentoEstagio } from "./acompanhamento";
import { FormalizacaoEstagio, TrilhaFormalizacao } from "./formalizacao";
import { OcorrenciasEstagio } from "./ocorrencias";

// Um estágio (M04, M05): quem são as partes, em que situação está e o que falta. A aba inicial
// segue o momento do ciclo: formalização enquanto o TCE não está ativo, acompanhamento durante
// o estágio, resumo depois do encerramento. Toda ação vai à API, que decide por perfil e vínculo.

const ABAS = ["resumo", "formalizacao", "acompanhamento", "ocorrencias"] as const;
const reais = (valor: string | null) => (valor === null ? "Não se aplica" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;
const TIPO_ADITIVO: Record<string, string> = { PRORROGACAO: "Prorrogação", ALTERACAO_CARGA_HORARIA: "Alteração de carga horária", SUBSTITUICAO_SUPERVISOR: "Substituição de supervisor" };
const SITUACAO_ADITIVO: Record<string, { rotulo: string; tom: "ok" | "pending" | "neutral" }> = {
  AGUARDANDO_ASSINATURAS: { rotulo: "Aguardando assinaturas", tom: "pending" },
  VIGENTE: { rotulo: "Vigente", tom: "ok" },
  CANCELADO: { rotulo: "Cancelado", tom: "neutral" },
};

function destinoDeVolta(valor: string | undefined) {
  return valor && valor.startsWith("/estagios") ? valor : "/estagios";
}

export default async function EstagioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;
  const consulta = lerConsulta(await searchParams);

  const detalhe = await getEstagioDetalhado(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const { estagio, identificacao, aditivos } = detalhe;
  const padrao = estagio.situacao === "EM_FORMALIZACAO" ? "formalizacao" : estagio.situacao === "ATIVO" ? "acompanhamento" : "resumo";
  const aba = (ABAS as readonly string[]).includes(consulta.aba ?? "") ? consulta.aba! : padrao;
  const situacao = SITUACAO_ESTAGIO[estagio.situacao];
  const api = `/api/v1/estagios/${id}`;
  const hoje = hojeSaoPaulo();
  const restantes = diasEntre(hoje, estagio.dataFimPrevista);
  const ordem = ["resumo", "formalizacao", "acompanhamento", "ocorrencias"].sort((a, b) => (a === padrao ? -1 : b === padrao ? 1 : 0));
  const rotulos: Record<string, string> = { resumo: "Resumo", formalizacao: "Formalização", acompanhamento: "Acompanhamento", ocorrencias: "Ocorrências" };
  const linkDocumento = "inline-flex items-center gap-1.5 rounded-md border border-navy-900/15 bg-white px-3 h-9 text-sm text-navy-900 hover:bg-nevoa-100 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: destinoDeVolta(consulta.voltar), rotulo: "Estágios" }}
        identidade={<Avatar nome={identificacao.estudanteNome} semente={estagio.estudanteId} tamanho="xl" />}
        title={identificacao.estudanteNome ?? "Estágio"}
        description={
          <>
            {TIPO_ESTAGIO[estagio.tipo]} na <span className="font-medium text-navy-900">{identificacao.concedente ?? "concedente"}</span>
            {identificacao.curso ? ` · ${identificacao.curso}` : ""}
          </>
        }
        meta={
          <>
            <StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>
            <span>
              {formatarDataCurta(estagio.dataInicio)} – {formatarDataCurta(estagio.dataFimPrevista)}
              {estagio.dataFimPrevista !== estagio.dataFimPactuada && <span className="text-navy-900/65"> (pactuado até {formatarDataCurta(estagio.dataFimPactuada)})</span>}
            </span>
            {estagio.situacao === "ATIVO" && <span>{restantes > 0 ? `${restantes} dias restantes` : "termina hoje"}</span>}
            <span>
              {h(estagio.cargaDiariaMinutos)}/dia · {h(estagio.cargaSemanalMinutos)}/semana
            </span>
            {estagio.dispensaDuracaoMaxima && <StatusBadge tone="neutral">Dispensa do limite de 2 anos</StatusBadge>}
          </>
        }
        acoes={
          <div className="flex flex-wrap gap-2" data-testid="documentos-estagio">
            <a className={linkDocumento} href={`${api}/tce/pdf`}>
              <FileDown className="size-4" aria-hidden />
              TCE (PDF)
            </a>
            <a className={linkDocumento} href={`${api}/plano-atividades/pdf`}>
              <FileDown className="size-4" aria-hidden />
              Plano (PDF)
            </a>
          </div>
        }
      />

      {estagio.situacao === "EM_FORMALIZACAO" && <TrilhaFormalizacao detalhe={detalhe} />}

      <Abas
        caminho={`/estagios/${id}`}
        consulta={{ voltar: consulta.voltar }}
        atual={aba}
        abas={ordem.map((chave) => ({ chave, rotulo: rotulos[chave] }))}
      />

      {aba === "resumo" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Painel titulo="Termo de Compromisso" className="xl:col-span-2" descricao={estagio.hashTce ? `SHA-256 ${estagio.hashTce.slice(0, 24)}…` : "Em edição, ainda sem hash"}>
            <ListaDefinicao
              colunas={3}
              itens={[
                { rotulo: "Estudante", valor: identificacao.estudanteNome && `${identificacao.estudanteNome} (${identificacao.matricula})` },
                { rotulo: "Concedente", valor: identificacao.concedente },
                { rotulo: "Convênio", valor: identificacao.convenio },
                { rotulo: "Início", valor: formatarData(estagio.dataInicio) },
                { rotulo: "Término pactuado", valor: formatarData(estagio.dataFimPactuada) },
                { rotulo: "Término previsto", valor: formatarData(estagio.dataFimPrevista) },
                { rotulo: "Jornada diária", valor: h(estagio.cargaDiariaMinutos) },
                { rotulo: "Jornada semanal", valor: h(estagio.cargaSemanalMinutos) },
                { rotulo: "Carga total", valor: h(estagio.cargaTotalMinutos) },
                { rotulo: "Bolsa", valor: reais(estagio.bolsaValor) },
                { rotulo: "Auxílio-transporte", valor: reais(estagio.auxilioTransporteValor) },
                { rotulo: "Seguro", valor: estagio.seguroExigido ? "Exigido" : "Não exigido" },
                { rotulo: "Condições pactuadas", valor: <span className="whitespace-pre-line">{estagio.condicoesPactuadas}</span>, largo: true },
              ]}
            />
          </Painel>
          <Painel titulo="Aditivos" descricao="Mudanças no TCE depois da ativação, com as três assinaturas (RF020)." flush>
            <ul className="divide-y divide-navy-900/[0.07]">
              {aditivos.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/65">Nenhum aditivo.</li>}
              {aditivos.map((aditivo) => (
                <li key={aditivo.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-navy-900">
                      Nº {aditivo.numero} · {TIPO_ADITIVO[aditivo.tipo] ?? aditivo.tipo}
                    </span>
                    <StatusBadge tone={SITUACAO_ADITIVO[aditivo.situacao]?.tom ?? "neutral"}>{SITUACAO_ADITIVO[aditivo.situacao]?.rotulo ?? aditivo.situacao}</StatusBadge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="text-xs font-medium text-azul-500 hover:text-navy-700" href={`/api/v1/aditivos/${aditivo.id}/pdf`}>
                      Baixar PDF
                    </a>
                    {aditivo.situacao === "AGUARDANDO_ASSINATURAS" &&
                      (["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"] as const).map((parte) => (
                        <BotaoAcao key={parte} url={`/api/v1/aditivos/${aditivo.id}/assinaturas`} confirmacao={{ titulo: "Assinar o aditivo?", descricao: "Sua identificação, a data, a hora e o hash deste aditivo ficam registrados.", confirmar: "Assinar" }} rotulo={`Assinar (${parte.toLowerCase()})`} corpo={{ parte }} tamanho="sm" />
                      ))}
                  </div>
                </li>
              ))}
            </ul>
            {estagio.situacao === "ATIVO" && (
              <details className="border-t border-navy-900/[0.07] px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Propor prorrogação</summary>
                <div className="mt-4">
                  <FormularioApi
                    url={`${api}/aditivos`}
                    rotuloEnviar="Propor prorrogação"
confirmacao={{ titulo: "Propor a prorrogação?", descricao: "O aditivo fica registrado e segue para assinatura das partes. Ele não apaga o termo original.", confirmar: "Propor prorrogação" }}
                    extras={{ tipo: "PRORROGACAO" }}
                    embutido
                    sucesso="Aditivo proposto: aguarda as três assinaturas"
                    campos={[
                      { nome: "nova_data_fim_pactuada", rotulo: "Novo término", tipo: "date", ajuda: "Respeita o teto de 2 anos na concedente." },
                      { nome: "justificativa", rotulo: "Justificativa", tipo: "textarea" },
                    ]}
                  />
                </div>
              </details>
            )}
          </Painel>
        </div>
      )}

      {aba === "formalizacao" && <FormalizacaoEstagio detalhe={detalhe} />}
      {aba === "acompanhamento" &&
        (estagio.situacao === "EM_FORMALIZACAO" ? (
          <Painel titulo="Acompanhamento">
            <p className="text-sm text-navy-900/65">Frequência, relatórios e avaliações começam depois da ativação do estágio.</p>
          </Painel>
        ) : (
          <AcompanhamentoEstagio identity={identity} estagioId={id} />
        ))}
      {aba === "ocorrencias" &&
        (estagio.situacao === "EM_FORMALIZACAO" ? (
          <Painel titulo="Ocorrências">
            <p className="text-sm text-navy-900/65">Afastamentos, conclusão e rescisão valem para estágios ativos.</p>
          </Painel>
        ) : (
          <OcorrenciasEstagio identity={identity} estagio={estagio} />
        ))}
    </div>
  );
}
