import { cn } from "./cn";

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-navy-900/[0.07]", className)} />;
}

/** Forma aproximada de uma página com cabeçalho, indicadores e uma tabela. */
export function EsqueletoDePagina() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando">
      <div className="space-y-2">
        <Esqueleto className="h-3 w-28" />
        <Esqueleto className="h-8 w-72" />
        <Esqueleto className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Esqueleto key={indice} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="surface-card space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, indice) => (
          <Esqueleto key={indice} className="h-10 w-full" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
