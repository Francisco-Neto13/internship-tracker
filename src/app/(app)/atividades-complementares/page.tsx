import { Building, CalendarRange, Clock } from "lucide-react";
import { redirect } from "next/navigation";
import { lerConsulta, lerPaginacao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataCurta, haQuantoTempo } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import { SITUACAO_ATIVIDADE } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { listAtividadesPagina, listFilaAnalisePagina } from "@/modules/atividades/services/atividade-service";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { Avatar } from "@/shared/ui/avatar";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { DataTable } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";
import { NovaAtividade } from "./nova-atividade";

// RF049-RF055. O estudante registra e acompanha as próprias atividades, vendo quanto ainda cabe
// em cada categoria; a coordenação decide a fila, mais antigas primeiro, vendo antes de aprovar
// quanto a aprovação contaria (o banco calcula pelo limite da categoria e do curso, RF051).

const h = (minutos: number | null) => (minutos === null ? "—" : `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`);

export default async function AtividadesComplementaresPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const paginaMinhas = lerPaginacao(consulta);
  const paginaFila = lerPaginacao(consulta, 20, "pagina_fila");
  const [{ items: fila, total: totalFila }, integralizacao] = await Promise.all([
    listFilaAnalisePagina(identity, { page: paginaFila.pagina, limit: paginaFila.porPagina }),
    getMinhaIntegralizacao(identity).catch((error: unknown) => {
      if (error instanceof DomainError && error.kind === "NOT_FOUND") return null;
      throw error;
    }),
  ]);
  const { items: minhas, total: totalMinhas } = integralizacao
    ? await listAtividadesPagina(identity, { estudanteId: integralizacao.estudanteId }, { page: paginaMinhas.pagina, limit: paginaMinhas.porPagina })
    : { items: [], total: 0 };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atividades complementares"
        description={
          integralizacao
            ? "Registre cada atividade com o comprovante. A coordenação analisa e as horas contam até o limite da categoria e do curso."
            : "Fila de análise dos cursos que você coordena, das mais antigas para as mais recentes."
        }
      />

      {integralizacao && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-4">
            <Painel titulo="Minhas atividades" flush>
              {totalMinhas === 0 ? (
                <div className="p-5">
                  <EstadoVazio compacto titulo="Nenhuma atividade ainda" descricao="Registre a primeira no formulário ao lado." />
                </div>
              ) : (
                <DataTable
                  embutida
                  items={minhas}
                  getRowKey={(atividade) => atividade.id}
                  testId="minhas-atividades"
                  rodape={<Paginacao pagina={paginaMinhas.pagina} porPagina={paginaMinhas.porPagina} total={totalMinhas} rotuloItens="atividades" />}
                  columns={[
                    {
                      chave: "atividade",
                      cabecalho: "Atividade",
                      celula: (atividade) => (
                        <span className="block min-w-0">
                          <span className="block truncate font-medium text-navy-900">{atividade.descricao}</span>
                          <span className="block truncate text-xs text-navy-900/60">{atividade.categoriaNome}</span>
                        </span>
                      ),
                    },
                    { chave: "declaradas", cabecalho: "Declaradas", alinhar: "direita", ocultarNoCelular: true, celula: (atividade) => h(atividade.horasDeclaradasMinutos) },
                    { chave: "aproveitadas", cabecalho: "Aproveitadas", alinhar: "direita", celula: (atividade) => h(atividade.horasAproveitadasMinutos) },
                    {
                      chave: "situacao",
                      cabecalho: "Situação",
                      celula: (atividade) => (
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={SITUACAO_ATIVIDADE[atividade.situacao].tom}>{SITUACAO_ATIVIDADE[atividade.situacao].rotulo}</StatusBadge>
                          {atividade.situacao === "DEVOLVIDA" && (
                            <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/reenvio`} rotulo="Reenviar" tamanho="sm" sucesso="Reenviada para análise" />
                          )}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </Painel>
            {integralizacao.categorias.length > 0 && (
              <Painel titulo="Quanto ainda cabe por categoria" descricao="Horas acima do limite não contam; a categoria marcada como cheia não aceita mais.">
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {integralizacao.categorias.map((categoria) => (
                    <li key={categoria.categoriaId}>
                      <Progresso
                        rotulo={categoria.categoriaNome ?? "Categoria"}
                        atual={minutosParaHoras(categoria.aproveitadoMinutos)}
                        total={minutosParaHoras(categoria.limiteMinutos)}
                        formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                      />
                    </li>
                  ))}
                </ul>
              </Painel>
            )}
          </div>
          <Painel titulo="Registrar atividade" descricao="Comprovante em PDF, JPEG ou PNG; o mesmo arquivo não vale para duas atividades (RF052).">
            {integralizacao.categorias.length > 0 ? (
              <NovaAtividade
                estudanteId={integralizacao.estudanteId}
                categorias={integralizacao.categorias.map((categoria) => ({ id: categoria.categoriaId, nome: categoria.categoriaNome ?? categoria.categoriaId }))}
              />
            ) : (
              <EstadoVazio compacto variante="indisponivel" titulo="Curso sem categorias" descricao="A coordenação ainda não definiu os limites por categoria do seu curso." />
            )}
          </Painel>
        </div>
      )}

      {totalFila > 0 && (
        <Painel titulo="Fila de análise" descricao={`${totalFila} atividade(s) aguardando decisão`} flush>
          <ul className="divide-y divide-navy-900/[0.07]" data-testid="fila-analise">
            {fila.map(({ atividade, previa }) => (
              <li key={atividade.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-3">
                  <Avatar nome={atividade.estudanteNome ?? null} semente={atividade.estudanteId} tamanho="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">{atividade.descricao}</p>
                    <p className="text-sm text-navy-900/65">
                      {atividade.estudanteNome ?? "Estudante"} · {atividade.matricula} · {atividade.categoriaNome}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-900/60">
                      <span className="inline-flex items-center gap-1">
                        <Building className="size-3.5" aria-hidden />
                        {atividade.instituicaoPromotora}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="size-3.5" aria-hidden />
                        {formatarDataCurta(atividade.dataInicio)} a {formatarDataCurta(atividade.dataFim)}
                      </span>
                      {atividade.enviadaEm && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden />
                          enviada {haQuantoTempo(atividade.enviadaEm)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:items-end">
                  <p className="text-sm text-navy-900">
                    <span className="font-semibold tabular-nums">{h(atividade.horasDeclaradasMinutos)}</span> declaradas
                    {previa && (
                      <span className={previa.excedentesMinutos > 0 ? "text-status-pending-text" : "text-navy-900/60"}>
                        {" "}
                        · aproveitaria {h(previa.aproveitadosMinutos)}
                        {previa.excedentesMinutos > 0 && ` (${h(previa.excedentesMinutos)} acima do limite)`}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/aprovacao`} rotulo="Aprovar" confirmacao={{ titulo: "Aprovar a atividade?", descricao: "A aprovação é definitiva: as horas são calculadas dentro dos limites da categoria e do curso e entram na integralização do estudante.", confirmar: "Aprovar" }} variante="default" tamanho="sm" sucesso="Aprovada" />
                    <BotaoAcao
                      url={`/api/v1/atividades-complementares/${atividade.id}/devolucao`}
                      rotulo="Devolver"
                      tamanho="sm"
                      pedirMotivo={{ campo: "motivo", pergunta: "O que o estudante precisa complementar?" }}
                    />
                    <BotaoAcao
                      url={`/api/v1/atividades-complementares/${atividade.id}/recusa`}
                      rotulo="Recusar"
                      variante="destructive"
                      tamanho="sm"
                      pedirMotivo={{ campo: "motivo", pergunta: "Motivo da recusa" }}
                      confirmacao={{ titulo: "Recusar a atividade?", descricao: "A recusa é final: não há recurso, e o estudante cadastra uma nova atividade se for o caso." }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Paginacao pagina={paginaFila.pagina} porPagina={paginaFila.porPagina} total={totalFila} rotuloItens="atividades" chavePagina="pagina_fila" />
        </Painel>
      )}

      {!integralizacao && totalFila === 0 &&<EstadoVazio titulo="Nada para analisar" descricao="Nenhuma atividade aguardando análise nos cursos que você coordena." />}
    </div>
  );
}
