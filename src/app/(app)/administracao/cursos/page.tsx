import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { CursoForm } from "./curso-form";

type Curso = Awaited<ReturnType<typeof listCursos>>["items"][number];

const COLUNAS: DataTableColumn<Curso>[] = [
  { chave: "codigo", cabecalho: "Código", celula: (curso) => <span className="font-mono text-navy-900">{curso.codigo}</span> },
  { chave: "nome", cabecalho: "Nome", celula: (curso) => <span className="text-navy-900">{curso.nome}</span> },
  {
    chave: "estagio",
    cabecalho: "Estágio mínimo",
    celula: (curso) => <span className="text-navy-900/60">{curso.cargaMinimaEstagioMinutos / 60}h</span>,
  },
  {
    chave: "atividades",
    cabecalho: "Atividades complementares",
    celula: (curso) => <span className="text-navy-900/60">{curso.cargaAtividadesComplementaresMinutos / 60}h</span>,
  },
];

export default async function CursosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const { items } = await listCursos(identity, { page: 1, limit: 100 });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M02 Gestão Acadêmica"
        title="Cursos"
        description="Cursos e exigências curriculares de estágio e atividades complementares (RF004)."
      />

      {items.length === 0 ? (
        <EstadoVazio
          variante="vazio"
          titulo="Nenhum curso cadastrado"
          descricao="Cadastre o primeiro curso no formulário abaixo."
        />
      ) : (
        <DataTable columns={COLUNAS} items={items} getRowKey={(curso) => curso.id} testId="cursos-lista" />
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Novo curso</h2>
        <CursoForm />
      </div>
    </section>
  );
}
