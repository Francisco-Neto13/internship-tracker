import { AlertTriangle, Archive, ArrowRightLeft, Bell, CalendarClock, CheckCircle2, KeyRound, FileClock, Hourglass, Scale, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataCurta, hojeSaoPaulo, haQuantoTempo } from "@/lib/datas";
import { humanizarCodigos } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { cn } from "@/shared/ui/cn";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";

// RF070: avisos dentro do sistema (sem e-mail), do mais recente para o mais antigo, agrupados por
// dia, com o ícone do assunto e o caminho até o registro. "Não lidas" é o filtro do dia a dia.

const ICONE: Record<string, LucideIcon> = {
  CONVENIO_A_VENCER: CalendarClock,
  RELATORIO_PENDENTE: FileClock,
  RELATORIO_ATRASADO: AlertTriangle,
  DIVERGENCIA_CARGA_HORARIA: Scale,
  SUBSTITUICAO_RESPONSAVEL: ArrowRightLeft,
  MUDANCA_SITUACAO: ArrowRightLeft,
  PRAZO_GUARDA_ATINGIDO: Archive,
  DURACAO_MAXIMA_ATINGIDA: Hourglass,
  RELATORIO_ANALISADO: CheckCircle2,
  ATIVIDADE_ANALISADA: CheckCircle2,
  RECUPERACAO_SENHA: KeyRound,
};

const LINK: Record<string, (id: string) => string> = {
  estagio: (id) => `/estagios/${id}`,
  convenio: () => "/administracao/convenios",
  atividade_complementar: () => "/atividades-complementares",
  documento: () => "/administracao/guarda-documental",
  usuario: (id) => `/administracao/usuarios/${id}`,
};

function rotuloDoDia(dia: string, hoje: string) {
  if (dia === hoje) return "Hoje";
  const ontem = new Date(Date.parse(`${hoje}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return dia === ontem ? "Ontem" : formatarDataCurta(dia);
}

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const apenasNaoLidas = consulta.filtro === "nao-lidas";
  const { itens, naoLidas } = await listNotificacoes(identity, { apenasNaoLidas, limite: 100 });
  const hoje = hojeSaoPaulo();
  const dia = (instante: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(instante);
  const grupos = itens.reduce<Map<string, typeof itens>>((mapa, item) => mapa.set(dia(item.criadoEm), [...(mapa.get(dia(item.criadoEm)) ?? []), item]), new Map());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notificações"
        description="Prazos, pendências e mudanças nos itens a que você está vinculado. Somente dentro do sistema."
        acoes={naoLidas > 0 && <BotaoAcao url="/api/v1/notificacoes/leitura" rotulo="Marcar todas como lidas" sucesso="Todas marcadas como lidas" />}
      />
      <nav aria-label="Filtrar notificações" className="flex gap-2">
        {[
          { href: "/notificacoes", rotulo: "Todas", ativa: !apenasNaoLidas },
          { href: "/notificacoes?filtro=nao-lidas", rotulo: `Não lidas (${naoLidas})`, ativa: apenasNaoLidas },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.ativa ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
              item.ativa ? "border-navy-700 bg-navy-700 text-white" : "border-navy-900/15 bg-white text-navy-900/75 hover:bg-nevoa-100",
            )}
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>
      {itens.length === 0 ? (
        <EstadoVazio
          titulo={apenasNaoLidas ? "Tudo lido" : "Nenhuma notificação"}
          descricao={apenasNaoLidas ? "Nenhuma notificação aguardando a sua leitura." : "Avisos de prazos e mudanças aparecem aqui quando acontecerem."}
        />
      ) : (
        <div className="flex flex-col gap-5" data-testid="notificacoes">
          {[...grupos.entries()].map(([data, doDia]) => (
            <section key={data} aria-labelledby={`dia-${data}`} className="flex flex-col gap-2">
              <h2 id={`dia-${data}`} className="text-xs font-medium text-navy-900/65">
                {rotuloDoDia(data, hoje)}
              </h2>
              <ul className="surface-card divide-y divide-navy-900/[0.07]">
                {doDia.map((item) => {
                  const Icone = ICONE[item.tipo] ?? Bell;
                  const destino = item.entidade && item.entidadeId ? LINK[item.entidade]?.(item.entidadeId) : undefined;
                  return (
                    <li key={item.id} className={cn("flex gap-3 px-5 py-4", !item.lidaEm && "bg-azul-500/[0.04]")}>
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", item.lidaEm ? "bg-nevoa-100 text-navy-900/65" : "bg-azul-500/10 text-azul-500")}>
                        <Icone className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className={cn("text-navy-900", !item.lidaEm && "font-semibold")}>{item.titulo}</span>
                          {!item.lidaEm && <span className="sr-only">não lida</span>}
                          <span className="text-xs text-navy-900/65">{haQuantoTempo(item.criadoEm)}</span>
                        </p>
                        <p className="mt-0.5 text-sm text-navy-900/70">{humanizarCodigos(item.mensagem)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {destino && (
                            <Link href={destino} className="text-sm font-medium text-azul-500 hover:text-navy-700">
                              Abrir →
                            </Link>
                          )}
                          {!item.lidaEm && <BotaoAcao url={`/api/v1/notificacoes/${item.id}/leitura`} rotulo="Marcar como lida" variante="ghost" tamanho="sm" />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
