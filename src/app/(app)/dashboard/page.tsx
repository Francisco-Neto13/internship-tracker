import { GraduationCap, LibraryBig } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { itensVisiveis } from "@/shared/ui/navigation";
import { PageHeader } from "@/shared/ui/page-header";
import { StatTile } from "@/shared/ui/stat-tile";
import { StatusBadge } from "@/shared/ui/status-badge";

export default async function DashboardPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const perfis = await listPerfisVigentes(identity);
  // Same registry the sidebar reads from (RF003): the dashboard just flattens it as cards
  const atalhos = itensVisiveis(perfis.map((vinculo) => vinculo.perfil)).filter((item) => item.href !== "/dashboard");

  const podeVerIndicadores = perfis.some(
    (vinculo) => vinculo.perfil === "ADMINISTRADOR" || vinculo.perfil === "COORDENACAO",
  );
  // RLS ja recorta o alcance por curso da coordenacao (Secao "Banco: papeis e RLS"); os
  // totais abaixo refletem apenas o que a politica libera para a identidade atual.
  const [{ total: totalCursos }, { total: totalEstudantes }] = podeVerIndicadores
    ? await Promise.all([
        listCursos(identity, { page: 1, limit: 1 }),
        listEstudantes(identity, { page: 1, limit: 1 }),
      ])
    : [{ total: 0 }, { total: 0 }];

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Painel" description="Pendências e módulos disponíveis para o seu perfil (Seção 8.3)." />

      {podeVerIndicadores && (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
          <StatTile label="Cursos cadastrados" valor={totalCursos} icon={LibraryBig} />
          <StatTile label="Estudantes visíveis" valor={totalEstudantes} icon={GraduationCap} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-navy-900/60">Perfis vigentes</h2>
        {perfis.length === 0 ? (
          <p className="text-sm text-navy-900/60">Nenhum perfil vigente.</p>
        ) : (
          <ul data-testid="perfis-vigentes" className="list-disc pl-5 text-sm text-navy-900">
            {perfis.map((vinculo) => (
              <li key={`${vinculo.perfil}-${vinculo.cursoId ?? "geral"}`}>{ROTULO_PERFIL[vinculo.perfil]}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Acesso rápido</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
          {atalhos.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface-card p-4 text-sm transition-colors hover:border-azul-500"
            >
              <p className="flex items-center gap-2 font-display font-semibold text-navy-900">
                {item.titulo}
                {item.status === "em-construcao" && <StatusBadge tone="pending">em construção</StatusBadge>}
              </p>
              <p className="mt-1 text-navy-900/60">{item.descricao}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
