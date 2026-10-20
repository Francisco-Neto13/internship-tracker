import { notFound, redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { catalogoPerfis } from "@/modules/acesso/domain/catalogo-perfis";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { idParamSchema } from "@/modules/acesso/schemas/usuario";
import { getUsuario } from "@/modules/acesso/services/usuario-service";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { UsuarioAcoes } from "./usuario-acoes";

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const usuario = await getUsuario(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const { items: cursos } = await listCursos(identity, { page: 1, limit: 100 });
  const nomeCurso = new Map(cursos.map((curso) => [curso.id, curso.nome]));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M01 Acesso e Usuários" title={usuario.nome} description={usuario.email} />

      <div className="flex flex-wrap items-center gap-3 text-sm text-navy-900/70">
        <StatusBadge tone={usuario.situacao === "ATIVO" ? "ok" : "neutral"}>{usuario.situacao}</StatusBadge>
        {usuario.trocaSenhaObrigatoria && (
          <StatusBadge tone="pending">
            Troca de senha pendente
            {usuario.senhaProvisoriaExpiraEm && ` (expira ${dataHora.format(usuario.senhaProvisoriaExpiraEm)})`}
          </StatusBadge>
        )}
      </div>

      <UsuarioAcoes
        usuario={{ id: usuario.id, nome: usuario.nome, email: usuario.email, situacao: usuario.situacao }}
        perfis={usuario.perfis.map((vinculo) => ({ perfil: vinculo.perfil, curso_id: vinculo.cursoId }))}
        catalogo={catalogoPerfis()}
        cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))}
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Histórico de vínculos</h2>
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10" data-testid="historico-vinculos">
          {usuario.historico.map((vinculo) => (
            <li key={vinculo.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
              <span className="text-navy-900">
                {ROTULO_PERFIL[vinculo.perfil]}
                {vinculo.cursoId && ` · ${nomeCurso.get(vinculo.cursoId) ?? "curso"}`}
              </span>
              <span className="text-navy-900/60">
                {dataHora.format(vinculo.vigenciaInicio)} até{" "}
                {vinculo.vigenciaFim ? dataHora.format(vinculo.vigenciaFim) : "vigente"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
