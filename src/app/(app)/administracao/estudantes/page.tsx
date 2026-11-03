import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { comConsulta, lerConsulta, lerPaginacao, opcao, uuidOu, type SearchParamsBrutos } from "@/lib/consulta";
import { SITUACAO_ACADEMICA } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Dialogo } from "@/shared/ui/dialogo";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";
import { EstudanteForm } from "./estudante-form";

// RF005: estudantes no alcance do perfil (a RLS recorta a coordenação pelos cursos que coordena).
// Busca, filtros, ordenação e página vão para o servidor pela URL; abrir um estudante leva a
// consulta junto, e o "voltar" do perfil devolve a mesma página.

const SITUACOES = ["MATRICULADO", "TRANCADO", "FORMADO", "DESLIGADO"] as const;

type Estudante = Awaited<ReturnType<typeof listEstudantes>>["items"][number];

export default async function EstudantesPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);

  const [{ items, total }, { items: cursos }, perfis] = await Promise.all([
    listEstudantes(identity, {
      page: pagina,
      limit: porPagina,
      busca: consulta.busca,
      cursoId: uuidOu(consulta.curso_id),
      situacao: opcao(consulta.situacao, SITUACOES),
      ordem: consulta.ordem,
    }),
    listCursos(identity, { page: 1, limit: 100 }),
    listPerfisVigentes(identity),
  ]);
  const administrador = perfis.some((vinculo) => vinculo.perfil === "ADMINISTRADOR");
  const filtrando = Boolean(consulta.busca || consulta.curso_id || consulta.situacao);
  const voltar = encodeURIComponent(comConsulta("/administracao/estudantes", consulta));

  const colunas: DataTableColumn<Estudante>[] = [
    {
      chave: "nome",
      cabecalho: "Estudante",
      ordenavel: "nome",
      celula: (estudante) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nome={estudante.nome} semente={estudante.id} tamanho="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-navy-900">{estudante.nome ?? "Nome não disponível"}</span>
            <span className="block truncate text-xs text-navy-900/60">{estudante.email ?? "—"}</span>
          </span>
        </span>
      ),
    },
    { chave: "matricula", cabecalho: "Matrícula", ordenavel: "matricula", celula: (estudante) => <span className="font-mono text-[13px] text-navy-900/80">{estudante.matricula}</span> },
    { chave: "curso", cabecalho: "Curso", ordenavel: "curso", ocultarNoCelular: true, celula: (estudante) => <span className="text-navy-900/80">{estudante.cursoNome ?? "—"}</span> },
    { chave: "periodo", cabecalho: "Período", ordenavel: "periodo", alinhar: "direita", ocultarNoCelular: true, celula: (estudante) => <span className="text-navy-900/80">{estudante.periodo}º</span> },
    {
      chave: "situacao",
      cabecalho: "Situação",
      ordenavel: "situacao",
      celula: (estudante) => <StatusBadge tone={SITUACAO_ACADEMICA[estudante.situacaoAcademica]?.tom ?? "neutral"}>{SITUACAO_ACADEMICA[estudante.situacaoAcademica]?.rotulo}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estudantes"
        description={administrador ? "Perfil acadêmico de todos os estudantes: curso, situação, estágios e integralização." : "Estudantes dos cursos que você coordena: curso, situação, estágios e integralização."}
        acoes={
          cursos.length > 0 && (
            <Dialogo
              gatilho={{ rotulo: "Cadastrar estudante", icone: <Plus className="size-4" aria-hidden /> }}
              titulo="Cadastrar estudante"
              descricao="Vincula uma conta existente a um curso, com matrícula e período (RF005)."
            >
              <EstudanteForm cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))} buscarContas={administrador} />
            </Dialogo>
          )
        }
      />

      <BarraFiltros
        busca="Buscar por nome ou matrícula"
        filtros={[
          { chave: "curso_id", rotulo: "Curso", todos: "Todos os cursos", opcoes: cursos.map((curso) => ({ valor: curso.id, rotulo: curso.nome })) },
          { chave: "situacao", rotulo: "Situação", todos: "Todas as situações", opcoes: SITUACOES.map((situacao) => ({ valor: situacao, rotulo: SITUACAO_ACADEMICA[situacao].rotulo })) },
        ]}
      />

      {items.length === 0 ? (
        filtrando ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhum estudante encontrado" descricao="Nenhum estudante corresponde à busca e aos filtros. Ajuste ou limpe os filtros." />
        ) : (
          <EstadoVazio
            titulo="Nenhum estudante ainda"
            descricao={cursos.length === 0 ? "Cadastre um curso antes de vincular estudantes." : "Cadastre o primeiro estudante a partir de uma conta com perfil Estudante."}
          />
        )
      ) : (
        <DataTable
          columns={colunas}
          items={items}
          getRowKey={(estudante) => estudante.id}
          getRowHref={(estudante) => `/administracao/estudantes/${estudante.id}?voltar=${voltar}`}
          consulta={consulta}
          caminho="/administracao/estudantes"
          testId="estudantes-lista"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="estudantes" />}
        />
      )}
    </div>
  );
}
