"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "./cn";

// Paginação de toda listagem, no padrão do benchmark (pamela_crm, Paginacao.tsx): intervalo
// exibido e total, itens por página, primeira/anterior/números com reticências/próxima/última e
// salto direto quando há muitas páginas. Diferença: o estado vive na URL (?pagina=&por_pagina=),
// então o servidor pagina de verdade, o link é compartilhável e voltar de um registro devolve a
// mesma página. Mudar o tamanho volta para a página 1 (o intervalo antigo deixa de existir).

export const TAMANHOS_PAGINA = [10, 20, 50, 100] as const;

/** 1 … 6 7 [8] 9 10 … 40: sempre a primeira e a última, a atual com dois vizinhos de cada lado. */
export function janelaDePaginas(atual: number, total: number, raio = 2): (number | "…")[] {
  if (total <= 1) return [1];
  const paginas = new Set<number>([1, total]);
  for (let pagina = atual - raio; pagina <= atual + raio; pagina += 1) {
    if (pagina >= 1 && pagina <= total) paginas.add(pagina);
  }
  const ordenadas = [...paginas].sort((a, b) => a - b);
  const saida: (number | "…")[] = [];
  ordenadas.forEach((pagina, indice) => {
    const anterior = ordenadas[indice - 1];
    // Um só número escondido ocupa o mesmo espaço que "…" e é clicável: mostra o número
    if (anterior !== undefined && pagina - anterior > 1) saida.push(pagina - anterior === 2 ? pagina - 1 : "…");
    saida.push(pagina);
  });
  return saida;
}

const botao =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-navy-900/15 bg-white px-2 text-sm text-navy-900 tabular-nums transition-colors hover:bg-nevoa-100 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none";
const desabilitado = "pointer-events-none opacity-40";

export function Paginacao({
  pagina,
  porPagina,
  total,
  rotuloItens = "registros",
  className,
  chavePagina = "pagina",
}: {
  pagina: number;
  porPagina: number;
  total: number;
  rotuloItens?: string;
  className?: string;
  /** Parâmetro da URL; muda só quando a tela tem duas listas paginadas. */
  chavePagina?: string;
}) {
  const pathname = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  const [salto, setSalto] = useState("");

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(pagina, totalPaginas);
  const de = total === 0 ? 0 : (atual - 1) * porPagina + 1;
  const ate = Math.min(total, atual * porPagina);

  const url = (alteracoes: Record<string, string | number>) => {
    const proximos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(alteracoes)) proximos.set(chave, String(valor));
    if (proximos.get(chavePagina) === "1") proximos.delete(chavePagina);
    const consulta = proximos.toString();
    return consulta ? `${pathname}?${consulta}` : pathname;
  };

  const irPara = (valor: string) => {
    const alvo = Math.trunc(Number(valor));
    setSalto("");
    if (Number.isFinite(alvo) && alvo >= 1) router.push(url({ [chavePagina]: Math.min(totalPaginas, alvo) }));
  };

  const seta = (alvo: number, rotulo: string, inativo: boolean, children: React.ReactNode) =>
    inativo ? (
      <span className={cn(botao, desabilitado)} aria-hidden>
        {children}
      </span>
    ) : (
      <Link href={url({ [chavePagina]: alvo })} className={botao} aria-label={rotulo} title={rotulo} scroll={false}>
        {children}
      </Link>
    );

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        "flex flex-col gap-3 border-t border-navy-900/10 px-4 py-3 text-sm text-navy-900/70 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="tabular-nums" aria-live="polite">
          {total === 0 ? (
            <>Nenhum resultado</>
          ) : (
            <>
              <span className="font-medium text-navy-900">
                {de.toLocaleString("pt-BR")}–{ate.toLocaleString("pt-BR")}
              </span>{" "}
              de <span className="font-medium text-navy-900">{total.toLocaleString("pt-BR")}</span> {rotuloItens}
            </>
          )}
        </p>
        <label className="flex items-center gap-2">
          <span>Por página</span>
          <select
            value={porPagina}
            onChange={(evento) => router.push(url({ por_pagina: evento.target.value, [chavePagina]: 1 }))}
            className="h-8 rounded-md border border-navy-900/15 bg-white px-2 text-sm text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
          >
            {TAMANHOS_PAGINA.map((tamanho) => (
              <option key={tamanho} value={tamanho}>
                {tamanho}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          {seta(1, "Primeira página", atual <= 1, <ChevronsLeft className="size-4" aria-hidden />)}
          {seta(atual - 1, "Página anterior", atual <= 1, <ChevronLeft className="size-4" aria-hidden />)}
          {janelaDePaginas(atual, totalPaginas).map((item, indice) =>
            item === "…" ? (
              <span key={`gap-${indice}`} className="px-1 text-navy-900/40" aria-hidden>
                …
              </span>
            ) : (
              <Link
                key={item}
                href={url({ [chavePagina]: item })}
                scroll={false}
                aria-label={`Página ${item}`}
                aria-current={item === atual ? "page" : undefined}
                className={cn(botao, item === atual && "border-navy-700 bg-navy-700 text-white hover:bg-navy-700")}
              >
                {item}
              </Link>
            ),
          )}
          {seta(atual + 1, "Próxima página", atual >= totalPaginas, <ChevronRight className="size-4" aria-hidden />)}
          {seta(totalPaginas, "Última página", atual >= totalPaginas, <ChevronsRight className="size-4" aria-hidden />)}
          {totalPaginas > 7 && (
            <input
              value={salto}
              inputMode="numeric"
              onChange={(evento) => setSalto(evento.target.value.replace(/\D/g, ""))}
              onKeyDown={(evento) => evento.key === "Enter" && irPara(salto)}
              onBlur={() => salto && irPara(salto)}
              placeholder="Ir p/"
              aria-label={`Ir para a página (1 a ${totalPaginas})`}
              className="ml-1 h-8 w-16 rounded-md border border-navy-900/15 bg-white text-center text-sm focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
            />
          )}
        </div>
      )}
    </nav>
  );
}
