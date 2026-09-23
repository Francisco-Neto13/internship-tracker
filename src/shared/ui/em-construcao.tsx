import { StatusBadge } from "./status-badge";
import type { NavItem } from "./navigation";

/** Structured stand-in for a screen whose module has no table or RLS yet (roadmap Fases 2-5). */
export function EmConstrucao({ item }: { item: NavItem }) {
  return (
    <div className="rounded-lg border border-dashed border-navy-900/20 bg-nevoa-100/60 p-6 text-sm text-navy-900/70">
      <div className="mb-2">
        <StatusBadge tone="pending">em construção</StatusBadge>
      </div>
      <p className="mt-1">{item.descricao}</p>
      <p className="mt-3 font-mono text-xs text-navy-900/50">
        {item.modulo} &middot; {item.rf}
      </p>
    </div>
  );
}
