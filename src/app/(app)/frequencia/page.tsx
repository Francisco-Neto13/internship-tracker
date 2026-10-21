import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listEstagiosDivergentes } from "@/modules/acompanhamento/services/frequencia-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF023 to RF028: active internships the caller follows (hours are recorded and homologated on
// each internship page) and, for advisor and coordination, the ones whose hours diverge now.
export default async function FrequenciaPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const [{ items }, divergentes] = await Promise.all([listEstagios(identity, { page: 1, limit: 100 }), listEstagiosDivergentes(identity)]);
  const ativos = items.filter((estagio) => estagio.situacao === "ATIVO");
  const divergencia = new Map(divergentes.map((item) => [item.estagio.id, item.divergencia]));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M05 Acompanhamento"
        title="Frequência e carga horária"
        description="Registro, homologação e divergências de cada estágio ativo (RF023-RF030)."
      />
      {ativos.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum estágio ativo" descricao="Nenhum estágio ativo no seu recorte de acesso." />
      ) : (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="estagios-ativos">
          {ativos.map((estagio) => {
            const item = divergencia.get(estagio.id);
            return (
              <li key={estagio.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-navy-900">
                <Link href={`/estagios/${estagio.id}`} className="underline-offset-4 hover:underline">
                  {estagio.estudanteNome ?? estagio.matricula} · {estagio.concedenteRazaoSocial}
                </Link>
                {item?.divergente && (
                  <StatusBadge tone="danger">
                    {`Divergência de ${item.percentual}%: ${item.minutosCumpridos / 60} h de ${item.minutosPrevistos / 60} h previstas`}
                  </StatusBadge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
