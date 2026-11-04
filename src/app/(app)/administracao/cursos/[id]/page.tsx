import { Briefcase, GraduationCap } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import { TIPO_ESTAGIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { getExigenciasCurso, listCategorias } from "@/modules/academico/services/categoria-service";
import { getCurso } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { getPeriodicidades } from "@/modules/academico/services/periodicidade-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { CapaCurso } from "@/shared/ui/capa";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Indicador } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF004, RF036, RF048: um curso e o que ele exige. Alterar carga mínima ou limites reapura a
// integralização de todos os estudantes do curso (gatilho), e a página diz isso antes de salvar.
// Os números de estudantes e estágios são os do alcance de quem consulta (RLS).

const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const curso = await getCurso(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const [{ categorias }, catalogo, periodicidades, estudantes, estagios] = await Promise.all([
    getExigenciasCurso(identity, id),
    listCategorias(identity, { incluirInativas: false }),
    getPeriodicidades(identity, id),
    listEstudantes(identity, { page: 1, limit: 1, cursoId: id, situacao: "MATRICULADO" }),
    listEstagios(identity, { page: 1, limit: 1, cursoId: id, situacao: "ATIVO" }),
  ]);
  const somaLimites = categorias.reduce((soma, item) => soma + item.limiteMinutos, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: "/administracao/cursos", rotulo: "Cursos" }}
        identidade={<CapaCurso codigo={curso.codigo} semente={curso.id} className="h-20 w-20 items-center justify-center rounded-xl px-0 pb-0 [&>span:first-child]:hidden" />}
        title={curso.nome}
        description={`Código ${curso.codigo}`}
        meta={
          <>
            <span>Estágio mínimo {h(curso.cargaMinimaEstagioMinutos)}</span>
            <span>Atividades complementares {h(curso.cargaAtividadesComplementaresMinutos)}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Indicador rotulo="Estudantes matriculados" valor={estudantes.total} contexto="no seu alcance" href={`/administracao/estudantes?curso_id=${id}&situacao=MATRICULADO`} icone={GraduationCap} />
        <Indicador rotulo="Estágios ativos" valor={estagios.total} contexto="no seu alcance" href={`/estagios?curso_id=${id}&situacao=ATIVO`} icone={Briefcase} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Painel titulo="Dados e exigências" descricao="Mudar uma carga reapura a integralização de todos os estudantes do curso, na mesma hora.">
            <FormularioApi
              url={`/api/v1/cursos/${id}`}
              metodo="PATCH"
              rotuloEnviar="Salvar curso"
confirmacao={{ titulo: "Salvar as alterações do curso?", descricao: "Mudar a carga exigida recalcula a integralização de todos os estudantes do curso.", confirmar: "Salvar curso" }}
              testId="curso-edicao"
              embutido
              sucesso="Curso atualizado"
              campos={[
                { nome: "codigo", rotulo: "Código", valorInicial: curso.codigo },
                { nome: "nome", rotulo: "Nome", valorInicial: curso.nome },
                { nome: "carga_minima_estagio_horas", rotulo: "Estágio mínimo (h)", tipo: "number", valorInicial: curso.cargaMinimaEstagioMinutos / 60 },
                { nome: "carga_atividades_complementares_horas", rotulo: "Atividades complementares (h)", tipo: "number", valorInicial: curso.cargaAtividadesComplementaresMinutos / 60 },
              ]}
            />
          </Painel>
          <Painel
            titulo="Categorias de atividades"
            descricao={`Limite de cada categoria no curso (RN-23). Soma dos limites: ${h(somaLimites)}; o total aproveitado nunca passa de ${h(curso.cargaAtividadesComplementaresMinutos)}.`}
            flush
          >
            <ul className="divide-y divide-navy-900/[0.07]" data-testid="exigencias">
              {categorias.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/65">Nenhum limite definido: sem limite no curso, uma categoria não aproveita horas.</li>}
              {categorias.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span className="text-navy-900">{item.categoriaNome}</span>
                  <span className="flex items-center gap-2">
                    {item.admiteEstagioNaoObrigatorio && <StatusBadge tone="neutral">Recebe estágio não obrigatório</StatusBadge>}
                    <span className="font-medium text-navy-900 tabular-nums">{h(item.limiteMinutos)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {catalogo.length > 0 && (
              <details className="border-t border-navy-900/[0.07] px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Definir limite de uma categoria</summary>
                <div className="mt-4">
                  <FormularioApi
                    url={`/api/v1/cursos/${id}/exigencias`}
                    metodo="PUT"
                    envolverEmLista="exigencias"
                    rotuloEnviar="Definir limite"
confirmacao={{ titulo: "Definir este limite?", descricao: "Mudar o limite da categoria recalcula a integralização de todos os estudantes do curso.", confirmar: "Definir limite" }}
                    embutido
                    sucesso="Limite definido"
                    campos={[
                      { nome: "categoria_id", rotulo: "Categoria", tipo: "select", obrigatorio: true, opcoes: catalogo.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome })) },
                      { nome: "limite_horas", rotulo: "Limite (h)", tipo: "number" },
                      { nome: "admite_estagio_nao_obrigatorio", rotulo: "Recebe estágio não obrigatório (RN-18)", tipo: "checkbox" },
                    ]}
                  />
                </div>
              </details>
            )}
          </Painel>
        </div>
        <Painel titulo="Relatórios de estágio" descricao="Periodicidade por tipo de estágio (RF036). Relatórios já gerados mantêm o prazo calculado na época." flush>
          <ul className="divide-y divide-navy-900/[0.07]">
            {periodicidades.map((item) => (
              <li key={item.tipoEstagio} className="flex flex-col gap-1 px-5 py-4 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy-900">{TIPO_ESTAGIO[item.tipoEstagio]}</span>
                  <StatusBadge tone={item.origem === "CURSO" ? "ok" : "neutral"}>{item.origem === "CURSO" ? "Definida pelo curso" : "Padrão legal"}</StatusBadge>
                </span>
                <span className="text-navy-900/70">
                  A cada {item.intervaloMeses} {item.intervaloMeses === 1 ? "mês" : "meses"}, entrega em até {item.prazoEntregaDias} dias; final em até {item.prazoRelatorioFinalDias} dias após o término.
                </span>
              </li>
            ))}
          </ul>
        </Painel>
      </div>
    </div>
  );
}
