import { ContadorAnimado } from "./contador-animado";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

// Indicador do painel. Três regras do benchmark (pamela_crm, Indicador.tsx) e do pedido:
// - `null` é "não sei", não zero: vira "Sem dado" com o motivo escrito, nunca um 0 que pareça
//   operação parada;
// - todo número diz de quando é (contexto) e leva ao que conta (href);
// - o tom só muda quando o número pede ação (atencao), não para enfeitar.

export function Indicador({
  rotulo,
  valor,
  contexto,
  motivoSemValor,
  href,
  icone: Icone,
  tom = "neutro",
  formatar,
}: {
  rotulo: string;
  valor: number | null;
  contexto?: string;
  motivoSemValor?: string;
  href?: string;
  icone?: LucideIcon;
  tom?: "neutro" | "atencao" | "ok";
  formatar?: (numero: number) => string;
}) {
  const atencao = tom === "atencao" && valor !== null && valor > 0;
  const corpo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-navy-900/65">{rotulo}</p>
        {Icone && (
          <Icone
            className={cn("size-4 shrink-0", atencao ? "text-status-pending-text" : "text-navy-900/30")}
            aria-hidden
          />
        )}
      </div>
      {valor === null ? (
        <p className="mt-2 text-2xl font-semibold text-navy-900/65" title={motivoSemValor}>
          Sem dado
        </p>
      ) : (
        <p className={cn("mt-2 text-[1.75rem] leading-none font-semibold tabular-nums", atencao ? "text-status-pending-text" : "text-navy-900")}>
          {formatar ? formatar(valor) : <ContadorAnimado valor={valor} />}
        </p>
      )}
      {(contexto || (valor === null && motivoSemValor)) && (
        <p className="mt-2 text-xs text-navy-900/65">{valor === null ? motivoSemValor : contexto}</p>
      )}
    </>
  );
  const classe = cn(
    "surface-card flex flex-col p-4",
    atencao && "border-status-pending-text/30",
    href && "transition-colors hover:border-azul-500/40 hover:bg-nevoa-50 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
  );
  return href ? (
    <Link href={href} className={classe}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

/** Barra de progresso acessível com rótulo e valor; `null` no total vira "sem exigência". */
export function Progresso({
  rotulo,
  atual,
  total,
  formatar = (numero) => numero.toLocaleString("pt-BR"),
  detalhe,
  className,
}: {
  rotulo: string;
  atual: number;
  total: number;
  formatar?: (numero: number) => string;
  detalhe?: string;
  className?: string;
}) {
  const percentual = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 100;
  const completo = total > 0 && atual >= total;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-navy-900">{rotulo}</span>
        <span className="text-navy-900/65 tabular-nums">
          {formatar(atual)} / {total > 0 ? formatar(total) : "sem exigência"}
          <span className="ml-2 font-medium text-navy-900">{percentual}%</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        className="mt-2 h-2 overflow-hidden rounded-full bg-nevoa-100"
      >
        <div className={cn("h-full origin-left animate-crescer-x rounded-full", completo ? "bg-status-ok-text" : "bg-azul-500")} style={{ width: `${percentual}%` }} />
      </div>
      {detalhe && <p className="mt-1.5 text-xs text-navy-900/65">{detalhe}</p>}
    </div>
  );
}
