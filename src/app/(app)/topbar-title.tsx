"use client";

import { usePathname } from "next/navigation";
import { encontrarItem } from "@/shared/ui/navigation";

/** Titulo da pagina atual, lido do mesmo registro NAVEGACAO da sidebar — nunca diverge da tela. */
export function TopbarTitle() {
  const pathname = usePathname();
  const item = encontrarItem(pathname);
  if (!item) return null;

  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium tracking-[0.14em] text-navy-900/45 uppercase">{item.modulo}</p>
      <p className="truncate text-sm font-semibold text-navy-900">{item.titulo}</p>
    </div>
  );
}
