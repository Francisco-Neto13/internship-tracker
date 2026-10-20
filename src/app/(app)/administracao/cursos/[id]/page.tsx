import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { getExigenciasCurso, listCategorias } from "@/modules/academico/services/categoria-service";
import { getCurso } from "@/modules/academico/services/curso-service";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";

// RF004: edit a course and its requirements per activity category (API: PATCH /cursos/{id},
// PUT /cursos/{id}/exigencias). Functional screen; the API validates and authorizes.
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
  const [{ categorias }, catalogo] = await Promise.all([getExigenciasCurso(identity, id), listCategorias(identity, { incluirInativas: false })]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M02 Gestão Acadêmica" title={curso.nome} description={`Código ${curso.codigo} (RF004)`} />

      <FormularioApi
        url={`/api/v1/cursos/${id}`}
        metodo="PATCH"
        rotuloEnviar="Salvar curso"
        testId="curso-edicao"
        campos={[
          { nome: "codigo", rotulo: "Código", valorInicial: curso.codigo },
          { nome: "nome", rotulo: "Nome", valorInicial: curso.nome },
          { nome: "carga_minima_estagio_horas", rotulo: "Estágio mínimo (h)", tipo: "number", valorInicial: curso.cargaMinimaEstagioMinutos / 60 },
          {
            nome: "carga_atividades_complementares_horas",
            rotulo: "Atividades complementares (h)",
            tipo: "number",
            valorInicial: curso.cargaAtividadesComplementaresMinutos / 60,
          },
        ]}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-navy-900/60">Limites por categoria</h2>
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10" data-testid="exigencias">
          {categorias.length === 0 && <li className="px-5 py-3 text-sm text-navy-900/60">Nenhum limite definido.</li>}
          {categorias.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm text-navy-900">
              <span>{item.categoriaNome}</span>
              <span className="text-navy-900/60">
                {item.limiteMinutos / 60} h{item.admiteEstagioNaoObrigatorio && " · recebe estágio não obrigatório"}
              </span>
            </li>
          ))}
        </ul>
        {catalogo.length > 0 && (
          <FormularioApi
            url={`/api/v1/cursos/${id}/exigencias`}
            metodo="PUT"
            envolverEmLista="exigencias"
            rotuloEnviar="Definir limite"
            campos={[
              { nome: "categoria_id", rotulo: "Categoria", tipo: "select", obrigatorio: true, opcoes: catalogo.map((c) => ({ valor: c.id, rotulo: c.nome })) },
              { nome: "limite_horas", rotulo: "Limite (h)", tipo: "number" },
              { nome: "admite_estagio_nao_obrigatorio", rotulo: "Recebe estágio não obrigatório (RN-18)", tipo: "checkbox" },
            ]}
          />
        )}
      </div>
    </section>
  );
}
