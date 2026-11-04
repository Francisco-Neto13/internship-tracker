import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { diasEntre, formatarData, prazoEmPalavras } from "@/lib/datas";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getParametrosVigentes } from "@/modules/academico/services/parametro-service";
import { listConveniosAVencer } from "@/modules/concedentes/services/convenio-service";
import { Avatar } from "@/shared/ui/avatar";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF012: convênios que vencem dentro da antecedência institucional sem renovação, agrupados
// pela urgência. Registro e renovação ficam na página da concedente (RF009, RF011).

export default async function ConveniosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const hoje = dataLocal();
  const { antecedenciaAlertaConvenioDias: dias } = await getParametrosVigentes(identity, hoje);
  const itens = await listConveniosAVencer(identity, hoje, dias);
  const grupos = [
    { titulo: "Vencem em até 7 dias", tom: "danger" as const, itens: itens.filter((item) => diasEntre(hoje, item.vigenciaFim) <= 7) },
    { titulo: "Vencem em até 30 dias", tom: "pending" as const, itens: itens.filter((item) => diasEntre(hoje, item.vigenciaFim) > 7 && diasEntre(hoje, item.vigenciaFim) <= 30) },
    { titulo: `Vencem em até ${dias} dias`, tom: "neutral" as const, itens: itens.filter((item) => diasEntre(hoje, item.vigenciaFim) > 30) },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Convênios a vencer"
        description={`Convênios que vencem nos próximos ${dias} dias sem renovação registrada (RF012). O prazo de alerta é um parâmetro institucional; registro e renovação ficam na página da concedente.`}
      />
      {itens.length === 0 ? (
        <EstadoVazio titulo="Nenhum convênio a vencer" descricao={`Nenhum convênio no seu alcance vence nos próximos ${dias} dias.`} />
      ) : (
        <div className="flex flex-col gap-4" data-testid="convenios-a-vencer">
          {grupos.map((grupo) => (
            <Painel key={grupo.titulo} titulo={grupo.titulo} acoes={<StatusBadge tone={grupo.tom}>{grupo.itens.length}</StatusBadge>} flush>
              <ul className="divide-y divide-navy-900/[0.07]">
                {grupo.itens.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/administracao/concedentes/${item.concedenteId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-nevoa-50 focus-visible:bg-nevoa-50 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <Avatar nome={item.concedenteRazaoSocial} semente={item.concedenteId} forma="quadrado" tamanho="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{item.concedenteRazaoSocial}</span>
                        <span className="block text-xs text-navy-900/65">Convênio {item.numero}</span>
                      </span>
                      <span className="text-right text-xs text-navy-900/65">
                        <span className="block font-medium text-navy-900">vence {prazoEmPalavras(item.vigenciaFim, hoje)}</span>
                        {formatarData(item.vigenciaFim)}
                      </span>
                      <ChevronRight className="size-4 text-navy-900/30" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Painel>
          ))}
        </div>
      )}
    </div>
  );
}
