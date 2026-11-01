"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "./cn";

// Busca e filtros de uma listagem, gravados na URL: o servidor filtra e pagina (nada depende do
// que já foi carregado no navegador), o link é compartilhável e o "voltar" do registro devolve a
// mesma consulta. Qualquer mudança volta para a página 1. A busca espera a pessoa parar de
// digitar (350 ms) antes de consultar.

export type FiltroOpcao = { valor: string; rotulo: string };
export type Filtro = { chave: string; rotulo: string; opcoes: FiltroOpcao[]; todos?: string };

const campo =
  "h-10 rounded-lg border border-navy-900/15 bg-white text-sm text-navy-900 transition-colors focus-visible:border-azul-500 focus-visible:ring-2 focus-visible:ring-azul-500/25 focus-visible:outline-none";

export function BarraFiltros({
  busca,
  filtros = [],
  className,
  children,
}: {
  /** Placeholder da busca textual (?busca=); omitir quando a listagem não busca por texto. */
  busca?: string;
  filtros?: Filtro[];
  className?: string;
  /** Ações à direita (exportar, criar). */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState(parametros.get("busca") ?? "");
  const ultimo = useRef(parametros.get("busca") ?? "");

  const aplicar = (alteracoes: Record<string, string | null>) => {
    const proximos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (valor) proximos.set(chave, valor);
      else proximos.delete(chave);
    }
    proximos.delete("pagina");
    const consulta = proximos.toString();
    iniciar(() => router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (busca === undefined || texto.trim() === ultimo.current) return;
    const espera = setTimeout(() => {
      ultimo.current = texto.trim();
      aplicar({ busca: texto.trim() || null });
    }, 350);
    return () => clearTimeout(espera);
    // aplicar muda a cada render; a busca só reage ao texto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const ativos = filtros.filter((filtro) => parametros.get(filtro.chave)).length + (parametros.get("busca") ? 1 : 0);

  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)} aria-busy={pendente}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {busca !== undefined && (
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-900/40" aria-hidden />
            <input
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={busca}
              className={cn(campo, "w-full pr-3 pl-9")}
            />
          </label>
        )}
        {filtros.map((filtro) => (
          <label key={filtro.chave} className="flex items-center">
            <span className="sr-only">{filtro.rotulo}</span>
            <select
              value={parametros.get(filtro.chave) ?? ""}
              onChange={(evento) => aplicar({ [filtro.chave]: evento.target.value || null })}
              className={cn(campo, "px-3", parametros.get(filtro.chave) && "border-azul-500/60 bg-azul-500/5 text-navy-700")}
            >
              <option value="">{filtro.todos ?? `${filtro.rotulo}: todos`}</option>
              {filtro.opcoes.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>
        ))}
        {ativos > 0 && (
          <button
            type="button"
            onClick={() => {
              setTexto("");
              ultimo.current = "";
              aplicar(Object.fromEntries([...filtros.map((filtro) => [filtro.chave, null]), ["busca", null], ["ordem", null]]));
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-navy-900/70 hover:bg-nevoa-100 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
            Limpar filtros
          </button>
        )}
        {pendente && <span className="text-xs text-navy-900/50">Atualizando…</span>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
