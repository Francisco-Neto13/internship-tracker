import Link from "next/link";
import { redirect } from "next/navigation";
import { lerConsulta, lerPaginacao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarData, hojeSaoPaulo, prazoEmPalavras } from "@/lib/datas";
import { getIdentity } from "@/lib/session";
import { listRelatoriosPendentesPagina } from "@/modules/acompanhamento/services/relatorio-service";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/ui/cn";
import { DataTable } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF040: relatórios que pedem ação nos estágios da pessoa: os que aguardam o orientador e os
// devidos pelo estudante (período encerrado), com o atraso calculado pelo prazo. O envio e a
// análise acontecem na página do estágio. Os filtros separam de quem é a vez.

const VISOES = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "orientador", rotulo: "Aguardando o orientador" },
  { chave: "estudante", rotulo: "Aguardando o estudante" },
  { chave: "atraso", rotulo: "Em atraso" },
] as const;

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const visao = VISOES.find((item) => item.chave === consulta.visao) ?? VISOES[0];
  const { pagina, porPagina } = lerPaginacao(consulta);
  const { items: itens, total, contagens } = await listRelatoriosPendentesPagina(identity, { visao: visao.chave, page: pagina, limit: porPagina });
  const hoje = hojeSaoPaulo();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatórios" description="Relatórios em análise ou com o período encerrado, por prazo de entrega. O envio e a análise acontecem na página de cada estágio (RF036-RF041)." />
      <nav aria-label="Filtrar relatórios" className="flex flex-wrap gap-2">
        {VISOES.map((item) => {
          const quantidade = contagens[item.chave];
          const ativa = item.chave === visao.chave;
          return (
            <Link
              key={item.chave}
              href={item.chave === "todos" ? "/relatorios" : `/relatorios?visao=${item.chave}`}
              aria-current={ativa ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
                ativa ? "border-navy-700 bg-navy-700 text-white" : "border-navy-900/15 bg-white text-navy-900/75 hover:bg-nevoa-100",
              )}
            >
              {item.rotulo}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", ativa ? "bg-white/20" : "bg-nevoa-100")}>{quantidade}</span>
            </Link>
          );
        })}
      </nav>
      {total === 0 ? (
        <EstadoVazio
          variante={contagens.todos === 0 ? "vazio" : "sem-resultados"}
          titulo={contagens.todos === 0 ? "Nenhum relatório pendente" : "Nenhum relatório nesta visão"}
          descricao={contagens.todos === 0 ? "Nenhum relatório devido ou em análise nos estágios que você acompanha." : "Escolha outra visão para ver os demais."}
        />
      ) : (
        <DataTable
          items={itens}
          getRowKey={(relatorio) => relatorio.id}
          getRowHref={(relatorio) => `/estagios/${relatorio.estagioId}?aba=acompanhamento`}
          testId="relatorios-pendentes"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="relatórios" />}
          columns={[
            {
              chave: "estudante",
              cabecalho: "Estudante",
              celula: (relatorio) => (
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar nome={relatorio.estudanteNome} semente={relatorio.estagioId} tamanho="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{relatorio.estudanteNome ?? "Estudante"}</span>
                    <span className="block text-xs text-navy-900/65">{relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório parcial nº ${relatorio.sequencia}`}</span>
                  </span>
                </span>
              ),
            },
            {
              chave: "prazo",
              cabecalho: "Prazo",
              celula: (relatorio) => (
                <span className="flex flex-col">
                  <span className="text-navy-900">{formatarData(relatorio.prazoEntrega)}</span>
                  <span className={cn("text-xs", relatorio.emAtraso ? "text-status-danger-text" : "text-navy-900/65")}>{prazoEmPalavras(relatorio.prazoEntrega, hoje)}</span>
                </span>
              ),
            },
            {
              chave: "vez",
              cabecalho: "Com quem está",
              celula: (relatorio) => (
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge tone="pending">{relatorio.pendenteDe === "ORIENTADOR" ? "Aguardando orientador" : "Aguardando estudante"}</StatusBadge>
                  {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
