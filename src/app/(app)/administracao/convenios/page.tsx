import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getParametrosVigentes } from "@/modules/academico/services/parametro-service";
import { listConveniosAVencer } from "@/modules/concedentes/services/convenio-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";

// RF012: agreements that lapse within the institutional lead time and have no renewal.
// Each agreement is registered and renewed on the page of its concedente (RF009, RF011).
export default async function ConveniosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const hoje = dataLocal();
  const { antecedenciaAlertaConvenioDias: dias } = await getParametrosVigentes(identity, hoje);
  const itens = await listConveniosAVencer(identity, hoje, dias);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M03 Concedentes e Convênios"
        title="Convênios a vencer"
        description={`Convênios que vencem nos próximos ${dias} dias sem renovação registrada (RF012). Registro e renovação ficam na página da concedente.`}
      />
      {itens.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum convênio a vencer" descricao="Nenhum convênio visível vence dentro do prazo de alerta." />
      ) : (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="convenios-a-vencer">
          {itens.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-navy-900">
              <Link href={`/administracao/concedentes/${item.concedenteId}`} className="underline-offset-4 hover:underline">
                {item.numero} · {item.concedenteRazaoSocial}
              </Link>
              <span className="text-navy-900/60">vence em {item.vigenciaFim}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
