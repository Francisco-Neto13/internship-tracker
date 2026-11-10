import { Plus } from "lucide-react";
import Link from "next/link";
import { comConsulta, lerConsulta, lerPaginacao, opcao, uuidOu, type SearchParamsBrutos } from "@/lib/consulta";
import { diasEntre, formatarDataCurta, hojeSaoPaulo } from "@/lib/datas";
import { identificarEstagio, SITUACAO_ESTAGIO, TIPO_ESTAGIO } from "@/lib/rotulos";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { buttonVariants } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF015, RN-37: estágios que o perfil alcança (a RLS recorta: o estudante vê os seus, o
// orientador e o supervisor os que acompanham, a concedente os dela, a coordenação os do curso).
// Busca, filtros, ordenação e página no servidor, pela URL.

type Estagio = Awaited<ReturnType<typeof listEstagios>>["items"][number];
const SITUACOES = ["EM_FORMALIZACAO", "ATIVO", "CONCLUIDO", "RESCINDIDO"] as const;
const TIPOS = ["OBRIGATORIO", "NAO_OBRIGATORIO"] as const;

/** Quanto do período já passou, para ler de relance quem está no começo ou perto do fim. */
function Andamento({ estagio, hoje }: { estagio: Estagio; hoje: string }) {
  if (estagio.situacao !== "ATIVO") return <span className="text-xs text-navy-900/65">Não se aplica</span>;
  const paraComecar = diasEntre(hoje, estagio.dataInicio);
  if (paraComecar > 0) return <span className="text-xs text-navy-900/65">{paraComecar === 1 ? "Começa amanhã" : `Começa em ${paraComecar} dias`}</span>;
  const total = Math.max(1, diasEntre(estagio.dataInicio, estagio.dataFimPrevista));
  const decorrido = Math.min(total, Math.max(0, diasEntre(estagio.dataInicio, hoje)));
  const percentual = Math.round((decorrido / total) * 100);
  const restantes = total - decorrido;
  return (
    <span className="flex min-w-28 flex-col gap-1">
      <span className="h-1.5 overflow-hidden rounded-full bg-nevoa-100" aria-hidden>
        <span className="block h-full rounded-full bg-azul-500" style={{ width: `${percentual}%` }} />
      </span>
      <span className="text-xs text-navy-900/65">{restantes > 0 ? `${restantes} dias restantes` : "No último dia"}</span>
    </span>
  );
}

export default async function EstagiosPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await identidadeDaTela("/estagios");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);
  const perfis = (await listPerfisVigentes(identity)).map((vinculo) => vinculo.perfil);
  const gestao = perfis.includes("COORDENACAO") || perfis.includes("ADMINISTRADOR");

  const [{ items, total }, cursos] = await Promise.all([
    listEstagios(identity, {
      page: pagina,
      limit: porPagina,
      busca: consulta.busca,
      situacao: opcao(consulta.situacao, SITUACOES),
      tipo: opcao(consulta.tipo, TIPOS),
      cursoId: uuidOu(consulta.curso_id),
      ordem: consulta.ordem,
    }),
    gestao ? listCursos(identity, { page: 1, limit: 100 }).then((resultado) => resultado.items) : Promise.resolve([]),
  ]);
  const hoje = hojeSaoPaulo();
  const filtrando = Boolean(consulta.busca || consulta.situacao || consulta.tipo || consulta.curso_id);
  const voltar = encodeURIComponent(comConsulta("/estagios", consulta));

  const colunas: DataTableColumn<Estagio>[] = [
    {
      chave: "estudante",
      cabecalho: "Estudante",
      ordenavel: "estudante",
      celula: (estagio) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nome={estagio.estudanteNome} semente={estagio.estudanteId} tamanho="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-navy-900">{identificarEstagio(estagio)}</span>
            {estagio.matricula ? <span className="block truncate font-mono text-xs text-navy-900/65">{estagio.matricula}</span> : <span className="block truncate text-xs text-navy-900/65">Nome não visível para o seu perfil</span>}
          </span>
        </span>
      ),
    },
    {
      chave: "concedente",
      cabecalho: "Concedente",
      ordenavel: "concedente",
      ocultarNoCelular: true,
      celula: (estagio) => (
        <span className="block min-w-0">
          <span className="block max-w-64 truncate text-navy-900">{estagio.concedenteRazaoSocial ?? "Não informada"}</span>
          <span className="block text-xs text-navy-900/65">{TIPO_ESTAGIO[estagio.tipo]}</span>
        </span>
      ),
    },
    {
      chave: "periodo",
      cabecalho: "Período",
      ordenavel: "inicio",
      ocultarNoCelular: true,
      celula: (estagio) => (
        <span className="whitespace-nowrap text-navy-900/80">
          {formatarDataCurta(estagio.dataInicio)} – {formatarDataCurta(estagio.dataFimPrevista)}
        </span>
      ),
    },
    { chave: "andamento", cabecalho: "Andamento", ocultarNoCelular: true, celula: (estagio) => <Andamento estagio={estagio} hoje={hoje} /> },
    {
      chave: "situacao",
      cabecalho: "Situação",
      ordenavel: "situacao",
      celula: (estagio) => <StatusBadge tone={SITUACAO_ESTAGIO[estagio.situacao].tom}>{SITUACAO_ESTAGIO[estagio.situacao].rotulo}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estágios"
        description="Formalização, acompanhamento, ocorrências e encerramento. Você vê os estágios do seu alcance."
        acoes={
          perfis.includes("COORDENACAO") && (
            <Link href="/estagios/novo" className={buttonVariants()}>
              <Plus className="size-4" aria-hidden />
              Novo estágio
            </Link>
          )
        }
      />

      <BarraFiltros
        busca="Estudante, matrícula ou concedente"
        filtros={[
          { chave: "situacao", rotulo: "Situação", todos: "Todas as situações", opcoes: SITUACOES.map((situacao) => ({ valor: situacao, rotulo: SITUACAO_ESTAGIO[situacao].rotulo })) },
          { chave: "tipo", rotulo: "Tipo", todos: "Todos os tipos", opcoes: TIPOS.map((tipo) => ({ valor: tipo, rotulo: TIPO_ESTAGIO[tipo] })) },
          ...(cursos.length > 1 ? [{ chave: "curso_id", rotulo: "Curso", todos: "Todos os cursos", opcoes: cursos.map((curso) => ({ valor: curso.id, rotulo: curso.nome })) }] : []),
        ]}
      />

      {items.length === 0 ? (
        filtrando ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhum estágio encontrado" descricao="Nenhum estágio corresponde à busca e aos filtros. Ajuste ou limpe os filtros." />
        ) : (
          <EstadoVazio
            titulo="Nenhum estágio no seu alcance"
            descricao={
              perfis.includes("COORDENACAO")
                ? "Cadastre o primeiro Termo de Compromisso em Novo estágio."
                : "Quando houver um estágio em que você participa, ele aparece aqui."
            }
          />
        )
      ) : (
        <DataTable
          columns={colunas}
          items={items}
          getRowKey={(estagio) => estagio.id}
          getRowHref={(estagio) => `/estagios/${estagio.id}?voltar=${voltar}`}
          consulta={consulta}
          caminho="/estagios"
          testId="estagios-lista"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="estágios" />}
        />
      )}
    </div>
  );
}
