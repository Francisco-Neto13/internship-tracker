import { redirect } from "next/navigation";
import { lerConsulta, lerPaginacao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataCurta } from "@/lib/datas";
import { minutosParaHoras } from "@/lib/horas";
import { getIdentity } from "@/lib/session";
import { listEstagiosDivergentes } from "@/modules/acompanhamento/services/frequencia-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { DataTable } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF023-RF028: estágios ativos que a pessoa acompanha. Lançar, homologar e analisar acontecem na
// página de cada estágio; aqui está a fila, com a divergência de carga já calculada para
// orientador e coordenação (até ontem, na tolerância institucional).

const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;

export default async function FrequenciaPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);
  const [{ items, total }, divergentes] = await Promise.all([
    listEstagios(identity, { page: pagina, limit: porPagina, situacao: "ATIVO", busca: consulta.busca, ordem: consulta.ordem ?? "estudante" }),
    listEstagiosDivergentes(identity),
  ]);
  const divergencia = new Map(divergentes.map((item) => [item.estagio.id, item]));
  const comDivergencia = divergentes.filter((item) => item.divergencia.divergente).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Frequência e carga horária"
        description="Estágios ativos que você acompanha. O registro do dia, a homologação e a análise de divergências ficam na página de cada estágio."
        meta={comDivergencia > 0 ? <StatusBadge tone="danger">{comDivergencia} com divergência acima da tolerância</StatusBadge> : undefined}
      />
      <BarraFiltros busca="Estudante, matrícula ou concedente" />
      {items.length === 0 ? (
        consulta.busca ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhum estágio encontrado" descricao="Nenhum estágio ativo corresponde à busca." />
        ) : (
          <EstadoVazio titulo="Nenhum estágio ativo" descricao="Quando um estágio em que você participa for ativado, a frequência dele aparece aqui." />
        )
      ) : (
        <DataTable
          items={items}
          getRowKey={(estagio) => estagio.id}
          getRowHref={(estagio) => `/estagios/${estagio.id}`}
          consulta={consulta}
          caminho="/frequencia"
          testId="estagios-ativos"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="estágios ativos" />}
          columns={[
            {
              chave: "estudante",
              cabecalho: "Estudante",
              ordenavel: "estudante",
              celula: (estagio) => (
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar nome={estagio.estudanteNome} semente={estagio.estudanteId} tamanho="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{estagio.estudanteNome ?? estagio.matricula}</span>
                    <span className="block truncate text-xs text-navy-900/55">{estagio.concedenteRazaoSocial}</span>
                  </span>
                </span>
              ),
            },
            { chave: "jornada", cabecalho: "Jornada", ocultarNoCelular: true, celula: (estagio) => `${h(estagio.cargaDiariaMinutos)}/dia · ${h(estagio.cargaSemanalMinutos)}/semana` },
            { chave: "fim", cabecalho: "Término previsto", ordenavel: "fim", ocultarNoCelular: true, celula: (estagio) => formatarDataCurta(estagio.dataFimPrevista) },
            {
              chave: "divergencia",
              cabecalho: "Carga até ontem",
              celula: (estagio) => {
                const item = divergencia.get(estagio.id);
                if (!item) return <span className="text-xs text-navy-900/50">Dentro do previsto</span>;
                const { minutosCumpridos, minutosPrevistos, percentual, divergente } = item.divergencia;
                return divergente ? (
                  <StatusBadge tone="danger">
                    {h(minutosCumpridos)} de {h(minutosPrevistos)} · {percentual?.toLocaleString("pt-BR")}%
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="pending">Caso aberto para o orientador</StatusBadge>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
