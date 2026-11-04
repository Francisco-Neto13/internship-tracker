import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

export type DataTableColumn<T> = {
  chave: string;
  cabecalho: string;
  celula: (item: T) => ReactNode;
  className?: string;
  /** Campo de ordenação aceito pelo backend (?ordem=campo ou -campo). */
  ordenavel?: string;
  /** Some em telas estreitas: a coluna principal e a situação ficam sempre. */
  ocultarNoCelular?: boolean;
  alinhar?: "esquerda" | "direita";
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  items: T[];
  getRowKey: (item: T) => string;
  /** Linha inteira clicável: o link vai na primeira célula e cobre a linha (sem JS). */
  getRowHref?: (item: T) => string;
  /** Consulta atual (para montar os links de ordenação sem perder filtros e página). */
  consulta?: Record<string, string | undefined>;
  caminho?: string;
  testId?: string;
  rodape?: ReactNode;
  className?: string;
  /** Sem borda própria: dentro de um <Painel> que já tem a superfície. */
  embutida?: boolean;
};

function hrefOrdem(caminho: string, consulta: Record<string, string | undefined>, campo: string) {
  const atual = consulta.ordem;
  const proxima = atual === campo ? `-${campo}` : atual === `-${campo}` ? undefined : campo;
  const parametros = new URLSearchParams(Object.entries({ ...consulta, ordem: proxima, pagina: undefined }).filter(([, v]) => v) as [string, string][]);
  const texto = parametros.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/**
 * Tabela de listagem renderizada no servidor. Cabeçalho com ordenação por link (o backend
 * ordena), linha inteira clicável quando há destino, coluna principal fixa à esquerda no
 * celular. Lista vazia não entra aqui: a página troca a tabela por <EstadoVazio>.
 */
export function DataTable<T>({
  columns,
  items,
  getRowKey,
  getRowHref,
  consulta = {},
  caminho = "",
  testId,
  rodape,
  className,
  embutida = false,
}: DataTableProps<T>) {
  return (
    <div className={cn(!embutida && "surface-card", "relative overflow-hidden", className)}>
      <div tabIndex={0} className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-900/10 bg-nevoa-50">
            <tr>
              {columns.map((column) => {
                const ordem = consulta.ordem;
                const ativa = column.ordenavel && (ordem === column.ordenavel || ordem === `-${column.ordenavel}`);
                const Icone = !ativa ? ArrowUpDown : ordem?.startsWith("-") ? ArrowDown : ArrowUp;
                return (
                  <th
                    key={column.chave}
                    scope="col"
                    aria-sort={ativa ? (ordem?.startsWith("-") ? "descending" : "ascending") : undefined}
                    className={cn(
                      "px-4 py-2.5 text-xs font-medium whitespace-nowrap text-navy-900/65",
                      column.alinhar === "direita" && "text-right",
                      column.ocultarNoCelular && "hidden md:table-cell",
                      column.className,
                    )}
                  >
                    {column.ordenavel ? (
                      <Link
                        href={hrefOrdem(caminho, consulta, column.ordenavel)}
                        scroll={false}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
                          ativa && "text-navy-900",
                        )}
                      >
                        {column.cabecalho}
                        <Icone className={cn("size-3.5", !ativa && "opacity-40")} aria-hidden />
                      </Link>
                    ) : (
                      column.cabecalho
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody data-testid={testId} className="linhas-em-sequencia">
            {items.map((item) => {
              const href = getRowHref?.(item);
              return (
                <tr
                  key={getRowKey(item)}
                  className={cn(
                    "relative border-b border-navy-900/[0.07] transition-colors duration-[var(--duracao-rapida)] last:border-0",
                    href && "hover:bg-nevoa-50 focus-within:bg-nevoa-50",
                  )}
                >
                  {columns.map((column, indice) => (
                    <td
                      key={column.chave}
                      className={cn(
                        "px-4 py-3 align-middle",
                        column.alinhar === "direita" && "text-right tabular-nums",
                        column.ocultarNoCelular && "hidden md:table-cell",
                      )}
                    >
                      {href && indice === 0 ? (
                        <Link
                          href={href}
                          className="block rounded outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-azul-500 focus-visible:after:ring-inset"
                        >
                          {column.celula(item)}
                        </Link>
                      ) : (
                        column.celula(item)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rodape}
    </div>
  );
}
