import type { ReactNode } from "react";
import { cn } from "./cn";

export type DataTableColumn<T> = {
  chave: string;
  cabecalho: string;
  celula: (item: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  items: T[];
  getRowKey: (item: T) => string;
  testId?: string;
};

/**
 * Tabela de listagem generica por colunas; sem estado, renderiza no servidor como as demais
 * telas. Lista vazia nao entra aqui: a pagina decide entre <DataTable> e <EstadoVazio> antes de
 * renderizar, para o painel vazio substituir a tabela em vez de virar uma linha dentro dela.
 */
export function DataTable<T>({ columns, items, getRowKey, testId }: DataTableProps<T>) {
  return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-nevoa-100/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.chave}
                className={cn(
                  "px-5 py-3 text-[10px] font-medium tracking-wide text-navy-900/60 uppercase",
                  column.className,
                )}
              >
                {column.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody data-testid={testId}>
          {items.map((item) => (
            <tr
              key={getRowKey(item)}
              className="border-b border-navy-900/10 transition-colors last:border-0 hover:bg-nevoa-100/50"
            >
              {columns.map((column) => (
                <td key={column.chave} className="px-5 py-3.5">
                  {column.celula(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
