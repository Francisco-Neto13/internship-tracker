import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF069, RN-30: documents whose retention period is over. The administrator eliminates the
// object; the row and its hash stay. Metadata only, never names nor content (RN-38).
const data = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function GuardaDocumentalPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const itens = await listDocumentosEmGuarda(identity, null);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M08 Administração e Controle" title="Guarda documental" description="Documentos com prazo de guarda atingido; a eliminação remove só o arquivo e fica auditada (RF069)." />
      {itens.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum documento a eliminar" descricao="Nenhum documento atingiu o prazo de guarda, ou o seu perfil não administra a guarda." />
      ) : (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="guarda-documental">
          {itens.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
              <span className="font-medium">{item.tipo}</span>
              {item.sensivel && <StatusBadge tone="pending">Sensível</StatusBadge>}
              <span className="text-navy-900/60">
                escopo {item.escopo.toLowerCase()} · guarda até {data(item.dataLiberacaoGuarda)}
              </span>
              <BotaoAcao url={`/api/v1/guarda-documental/${item.id}/eliminacao`} rotulo="Eliminar arquivo" variante="destructive" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
