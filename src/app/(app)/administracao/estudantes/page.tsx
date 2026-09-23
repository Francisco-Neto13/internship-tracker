import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { EstudanteForm } from "./estudante-form";

const SITUACAO_TONE: Record<string, StatusTone> = {
  MATRICULADO: "ok",
  TRANCADO: "pending",
  FORMADO: "neutral",
  DESLIGADO: "danger",
};

type Estudante = Awaited<ReturnType<typeof listEstudantes>>["items"][number];

const COLUNAS: DataTableColumn<Estudante>[] = [
  { chave: "nome", cabecalho: "Nome", celula: (estudante) => <span className="text-navy-900">{estudante.nome ?? "-"}</span> },
  {
    chave: "matricula",
    cabecalho: "Matrícula",
    celula: (estudante) => <span className="font-mono text-navy-900">{estudante.matricula}</span>,
  },
  { chave: "periodo", cabecalho: "Período", celula: (estudante) => <span className="text-navy-900/60">{estudante.periodo}</span> },
  {
    chave: "situacao",
    cabecalho: "Situação",
    celula: (estudante) => (
      <StatusBadge tone={SITUACAO_TONE[estudante.situacaoAcademica] ?? "neutral"}>
        {estudante.situacaoAcademica}
      </StatusBadge>
    ),
  },
];

export default async function EstudantesPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const [{ items }, { items: cursos }] = await Promise.all([
    listEstudantes(identity, { page: 1, limit: 100 }),
    listCursos(identity, { page: 1, limit: 100 }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M02 Gestão Acadêmica"
        title="Estudantes"
        description="Cadastro de estudantes com matrícula, curso e período (RF005)."
      />

      {items.length === 0 ? (
        <EstadoVazio
          variante="vazio"
          titulo="Nenhum estudante visível"
          descricao="Nenhum estudante cadastrado no seu recorte de acesso ainda."
        />
      ) : (
        <DataTable columns={COLUNAS} items={items} getRowKey={(estudante) => estudante.id} testId="estudantes-lista" />
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Novo estudante</h2>
        {cursos.length === 0 ? (
          <p className="text-sm text-navy-900/60">Cadastre um curso antes de vincular um estudante.</p>
        ) : (
          <EstudanteForm cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))} />
        )}
      </div>
    </section>
  );
}
