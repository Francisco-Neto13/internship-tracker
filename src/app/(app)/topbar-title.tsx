"use client";

import { usePathname } from "next/navigation";
import { encontrarItem } from "@/shared/ui/navigation";

/** Área e página atuais, lidas do mesmo registro NAVEGACAO da sidebar: nunca divergem da tela. */
export function TopbarTitle() {
  const pathname = usePathname();
  const item = encontrarItem(pathname);
  if (!item) return null;

  return (
    <div className="min-w-0">
      {item.modulo !== item.titulo && <p className="truncate text-xs text-navy-900/50">{item.modulo}</p>}
      <p className="truncate text-sm font-semibold text-navy-900">{item.titulo}</p>
    </div>
  );
}
