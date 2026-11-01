import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF070: the caller's in-system notifications (no e-mail), newest first. Functional screen.

const LINK: Record<string, (id: string) => string> = {
  estagio: (id) => `/estagios/${id}`,
  convenio: () => "/administracao/convenios",
  atividade_complementar: () => "/atividades-complementares",
  documento: () => "/administracao/auditoria",
};

export default async function NotificacoesPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { itens, naoLidas } = await listNotificacoes(identity, { apenasNaoLidas: false, limite: 100 });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="Transversal" title="Notificações" description="Prazos, pendências e mudanças de situação dos itens a que você está vinculado (RF070)." />
      {naoLidas > 0 && (
        <div className="flex items-center gap-3 text-sm text-navy-900/70">
          {naoLidas} não lida(s) <BotaoAcao url="/api/v1/notificacoes/leitura" rotulo="Marcar todas como lidas" />
        </div>
      )}
      {itens.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhuma notificação" descricao="Você ainda não recebeu notificações." />
      ) : (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="notificacoes">
          {itens.map((item) => {
            const destino = item.entidade && item.entidadeId ? LINK[item.entidade]?.(item.entidadeId) : undefined;
            return (
              <li key={item.id} className="flex flex-col gap-1 px-5 py-3 text-navy-900">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{item.titulo}</span>
                  {!item.lidaEm && <StatusBadge tone="pending">Nova</StatusBadge>}
                  <span className="text-navy-900/50">{item.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                </div>
                <p className="text-navy-900/80">{item.mensagem}</p>
                <div className="flex flex-wrap gap-3">
                  {destino && (
                    <Link href={destino} className="underline-offset-4 hover:underline">
                      Abrir
                    </Link>
                  )}
                  {!item.lidaEm && <BotaoAcao url={`/api/v1/notificacoes/${item.id}/leitura`} rotulo="Marcar como lida" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
