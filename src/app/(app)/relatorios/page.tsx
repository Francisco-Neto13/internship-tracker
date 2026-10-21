import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF040: reports due or waiting for analysis in the caller's internships; sending and analysis
// happen on each internship page
export default async function RelatoriosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const pendentes = await listRelatoriosPendentes(identity);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M05 Acompanhamento" title="Relatórios" description="Relatórios devidos e em análise, com prazo e atraso (RF036-RF041)." />
      {pendentes.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum relatório pendente" descricao="Nenhum relatório devido ou em análise no seu recorte." />
      ) : (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="relatorios-pendentes">
          {pendentes.map((relatorio) => (
            <li key={relatorio.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-navy-900">
              <Link href={`/estagios/${relatorio.estagioId}`} className="underline-offset-4 hover:underline">
                {relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório ${relatorio.sequencia}`} · prazo {relatorio.prazoEntrega}
              </Link>
              <span className="flex gap-2">
                <StatusBadge tone="pending">{relatorio.pendenteDe === "ORIENTADOR" ? "Aguardando orientador" : "Aguardando estudante"}</StatusBadge>
                {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
