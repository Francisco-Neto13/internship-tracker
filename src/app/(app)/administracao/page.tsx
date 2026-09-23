import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { itensVisiveis } from "@/shared/ui/navigation";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export default async function AdministracaoPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const perfis = await listPerfisVigentes(identity);
  const administracao = itensVisiveis(perfis.map((vinculo) => vinculo.perfil)).find(
    (item) => item.href === "/administracao",
  );

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Administração"
        description="Usuários, cursos, concedentes, convênios, parâmetros institucionais, relatórios gerenciais e auditoria."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {administracao?.children?.map((item) => (
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
        {administracao?.children?.length === 0 && (
          <p className="text-sm text-navy-900/60">Nenhum item de administração disponível para o seu perfil.</p>
        )}
      </div>
    </section>
  );
}
