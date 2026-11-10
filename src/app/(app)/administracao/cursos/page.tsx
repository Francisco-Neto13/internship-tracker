import { Briefcase, GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import { lerConsulta, lerPaginacao, type SearchParamsBrutos } from "@/lib/consulta";
import { minutosParaHoras } from "@/lib/horas";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { CapaCurso } from "@/shared/ui/capa";
import { Dialogo } from "@/shared/ui/dialogo";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { CursoForm } from "./curso-form";

// RF004: cursos como cartões (poucos, e cada um é reconhecido pelo código e pelas exigências),
// com o que importa para a gestão: carga mínima de estágio, carga de atividades complementares,
// estudantes matriculados e estágios ativos no alcance do perfil.

const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;

export default async function CursosPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await identidadeDaTela("/administracao/cursos");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);
  const [{ items, total }, perfis] = await Promise.all([
    listCursos(identity, { page: pagina, limit: porPagina, busca: consulta.busca, comContagens: true }),
    listPerfisVigentes(identity),
  ]);
  const administrador = perfis.some((vinculo) => vinculo.perfil === "ADMINISTRADOR");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cursos"
        description="Exigências curriculares de estágio e de atividades complementares, categorias e periodicidade de relatórios."
        acoes={
          administrador && (
            <Dialogo gatilho={{ rotulo: "Novo curso", icone: <Plus className="size-4" aria-hidden /> }} titulo="Novo curso" descricao="Código, nome e as cargas exigidas para integralizar.">
              <CursoForm />
            </Dialogo>
          )
        }
      />
      <BarraFiltros busca="Nome ou código do curso" />

      {items.length === 0 ? (
        consulta.busca ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhum curso encontrado" descricao="Nenhum curso com esse nome ou código." />
        ) : (
          <EstadoVazio titulo="Nenhum curso cadastrado" descricao={administrador ? "Cadastre o primeiro curso em Novo curso." : "O administrador cadastra os cursos."} />
        )
      ) : (
        <div className="surface-card overflow-hidden">
          <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="cursos-lista">
            {items.map((curso) => (
              <li key={curso.id}>
                <Link
                  href={`/administracao/cursos/${curso.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-navy-900/10 bg-white transition-shadow hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
                >
                  <CapaCurso codigo={curso.codigo} semente={curso.id} className="rounded-none" />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <p className="line-clamp-2 font-semibold text-navy-900 group-hover:text-navy-700">{curso.nome}</p>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-navy-900/65">Estágio mínimo</dt>
                        <dd className="font-medium text-navy-900 tabular-nums">{h(curso.cargaMinimaEstagioMinutos)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-navy-900/65">Ativ. complementares</dt>
                        <dd className="font-medium text-navy-900 tabular-nums">{h(curso.cargaAtividadesComplementaresMinutos)}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap gap-4 border-t border-navy-900/[0.07] pt-3 text-xs text-navy-900/65">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="size-4 text-navy-900/40" aria-hidden />
                        {curso.estudantesMatriculados ?? "Sem contagem de"} matriculados
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="size-4 text-navy-900/40" aria-hidden />
                        {curso.estagiosAtivos ?? "Sem contagem de"} estágios ativos
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="cursos" />
        </div>
      )}
    </div>
  );
}
