import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { TRANSICOES_SITUACAO_ACADEMICA } from "@/modules/academico/domain/situacao-academica";
import { listCursos } from "@/modules/academico/services/curso-service";
import { getEstudante } from "@/modules/academico/services/estudante-service";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF005: edit a student (API: PATCH /estudantes/{id}). The situation offers only the allowed
// transitions (D10, pending validation with the advisor); the service and a trigger enforce them.
export default async function EstudantePage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const estudante = await getEstudante(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const { items: cursos } = await listCursos(identity, { page: 1, limit: 100 });
  const situacoes = [estudante.situacaoAcademica, ...TRANSICOES_SITUACAO_ACADEMICA[estudante.situacaoAcademica]];

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M02 Gestão Acadêmica" title={estudante.nome ?? estudante.matricula} description={`Matrícula ${estudante.matricula} (RF005)`} />
      <div>
        <StatusBadge tone={estudante.situacaoAcademica === "MATRICULADO" ? "ok" : "neutral"}>{estudante.situacaoAcademica}</StatusBadge>
      </div>

      <FormularioApi
        url={`/api/v1/estudantes/${id}`}
        metodo="PATCH"
        rotuloEnviar="Salvar estudante"
        testId="estudante-edicao"
        campos={[
          { nome: "curso_id", rotulo: "Curso", tipo: "select", obrigatorio: true, valorInicial: estudante.cursoId, opcoes: cursos.map((c) => ({ valor: c.id, rotulo: c.nome })) },
          { nome: "matricula", rotulo: "Matrícula", valorInicial: estudante.matricula },
          { nome: "periodo", rotulo: "Período", tipo: "number", valorInicial: estudante.periodo },
          {
            nome: "situacao_academica",
            rotulo: "Situação acadêmica",
            tipo: "select",
            obrigatorio: true,
            valorInicial: estudante.situacaoAcademica,
            opcoes: situacoes.map((situacao) => ({ valor: situacao, rotulo: situacao })),
          },
        ]}
      />
    </section>
  );
}
