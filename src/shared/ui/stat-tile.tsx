import type { LucideIcon } from "lucide-react";
import { ContadorAnimado } from "./contador-animado";

export function StatTile({ label, valor, icon: Icon }: { label: string; valor: number; icon: LucideIcon }) {
  return (
    <div className="surface-card flex items-center gap-4 p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-nevoa-100 text-navy-700 ring-1 ring-navy-900/10">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-semibold text-navy-900">
          <ContadorAnimado valor={valor} />
        </p>
        <p className="text-xs text-navy-900/60">{label}</p>
      </div>
    </div>
  );
}
