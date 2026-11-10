import { LIMITE, UFS } from "@/lib/campos";
import { Plus } from "lucide-react";
import { comConsulta, lerConsulta, lerPaginacao, opcao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarCnpj, SITUACAO_CONCEDENTE } from "@/lib/rotulos";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Dialogo } from "@/shared/ui/dialogo";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF007, RF013: organizações que recebem estagiários. Busca por razão social, nome fantasia ou
// CNPJ e filtro de situação no servidor; o cadastro abre num diálogo e leva à página criada.

type Concedente = Awaited<ReturnType<typeof listConcedentes>>["items"][number];
const SITUACOES = ["ATIVA", "SUSPENSA"] as const;

export default async function ConcedentesPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await identidadeDaTela("/administracao/concedentes");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);
  const { items, total } = await listConcedentes(identity, {
    page: pagina,
    limit: porPagina,
    busca: consulta.busca,
    situacao: opcao(consulta.situacao, SITUACOES),
  });
  const filtrando = Boolean(consulta.busca || consulta.situacao);
  const voltar = encodeURIComponent(comConsulta("/administracao/concedentes", consulta));

  const colunas: DataTableColumn<Concedente>[] = [
    {
      chave: "razao",
      cabecalho: "Organização",
      celula: (concedente) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nome={concedente.nomeFantasia ?? concedente.razaoSocial} semente={concedente.id} forma="quadrado" tamanho="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-navy-900">{concedente.razaoSocial}</span>
            <span className="block truncate text-xs text-navy-900/65">{concedente.nomeFantasia ?? concedente.areaAtuacao}</span>
          </span>
        </span>
      ),
    },
    { chave: "cnpj", cabecalho: "CNPJ", ocultarNoCelular: true, celula: (concedente) => <span className="font-mono text-[13px] whitespace-nowrap text-navy-900/75">{formatarCnpj(concedente.cnpj)}</span> },
    { chave: "local", cabecalho: "Município", ocultarNoCelular: true, celula: (concedente) => <span className="text-navy-900/75">{`${concedente.municipio}/${concedente.uf}`}</span> },
    { chave: "area", cabecalho: "Área de atuação", ocultarNoCelular: true, celula: (concedente) => <span className="block max-w-48 truncate text-navy-900/75">{concedente.areaAtuacao}</span> },
    {
      chave: "situacao",
      cabecalho: "Situação",
      celula: (concedente) => <StatusBadge tone={SITUACAO_CONCEDENTE[concedente.situacao].tom}>{SITUACAO_CONCEDENTE[concedente.situacao].rotulo}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Concedentes"
        description="Organizações que recebem estagiários. Suspensa não ativa estágios novos; os em andamento seguem."
        acoes={
          <Dialogo gatilho={{ rotulo: "Nova concedente", icone: <Plus className="size-4" aria-hidden /> }} titulo="Nova concedente" descricao="Dados da organização e do representante legal (RF007)." largura="lg">
            <FormularioApi
              validacao="concedenteNovo"
                  url="/api/v1/concedentes"
              rotuloEnviar="Cadastrar concedente"
              redirecionarPara="/administracao/concedentes/:id"
              embutido
              campos={[
                { nome: "razao_social", max: LIMITE.razaoSocial, rotulo: "Razão social" },
                { nome: "nome_fantasia", max: LIMITE.nomeFantasia, rotulo: "Nome fantasia" },
                { nome: "cnpj", max: LIMITE.cnpj, mascara: "cnpj", rotulo: "CNPJ", ajuda: "Números e, no CNPJ alfanumérico, letras nos 12 primeiros caracteres." },
                { nome: "area_atuacao", max: LIMITE.areaAtuacao, rotulo: "Área de atuação" },
                { nome: "logradouro", max: LIMITE.logradouro, rotulo: "Logradouro" },
                { nome: "numero_endereco", max: LIMITE.numeroEndereco, rotulo: "Número" },
                { nome: "complemento", max: LIMITE.complemento, rotulo: "Complemento" },
                { nome: "bairro", max: LIMITE.bairro, rotulo: "Bairro" },
                { nome: "municipio", max: LIMITE.municipio, rotulo: "Município" },
                { nome: "uf", rotulo: "UF", tipo: "select", opcoes: UFS.map((uf) => ({ valor: uf, rotulo: uf })) },
                { nome: "cep", max: LIMITE.cep, mascara: "cep", rotulo: "CEP" },
                { nome: "email_contato", max: LIMITE.email, rotulo: "E-mail de contato", tipo: "email" },
                { nome: "telefone_contato", max: LIMITE.telefone, mascara: "telefone", rotulo: "Telefone" },
                { nome: "representante_legal_nome", max: LIMITE.representante, rotulo: "Representante legal" },
                { nome: "representante_legal_cargo", max: LIMITE.cargo, rotulo: "Cargo do representante" },
              ]}
            />
          </Dialogo>
        }
      />
      <BarraFiltros
        busca="Razão social, nome fantasia ou CNPJ"
        filtros={[{ chave: "situacao", rotulo: "Situação", todos: "Todas as situações", opcoes: SITUACOES.map((situacao) => ({ valor: situacao, rotulo: SITUACAO_CONCEDENTE[situacao].rotulo })) }]}
      />
      {items.length === 0 ? (
        filtrando ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhuma concedente encontrada" descricao="Nenhuma organização corresponde à busca e aos filtros." />
        ) : (
          <EstadoVazio titulo="Nenhuma concedente" descricao="Cadastre a primeira organização em Nova concedente." />
        )
      ) : (
        <DataTable
          columns={colunas}
          items={items}
          getRowKey={(concedente) => concedente.id}
          getRowHref={(concedente) => `/administracao/concedentes/${concedente.id}?voltar=${voltar}`}
          testId="concedentes-lista"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="concedentes" />}
        />
      )}
    </div>
  );
}
