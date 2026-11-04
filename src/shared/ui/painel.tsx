import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Seção de conteúdo de uma página: título curto, contexto opcional, ações à direita e o corpo.
 * `flush` tira o recuo do corpo para tabelas e listas que vão de borda a borda.
 */
export function Painel({
  titulo,
  descricao,
  acoes,
  verTodos,
  children,
  flush = false,
  className,
  id,
}: {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  /** Link "ver tudo" para a listagem completa daquilo que o painel resume. */
  verTodos?: { href: string; rotulo?: string };
  children: ReactNode;
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  const temCabecalho = titulo || descricao || acoes || verTodos;
  return (
    <section id={id} className={cn("surface-card flex min-w-0 animate-surgir flex-col", className)} aria-labelledby={id && titulo ? `${id}-titulo` : undefined}>
      {temCabecalho && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-900/[0.07] px-5 py-4">
          <div className="min-w-0">
            {titulo && (
              <h2 id={id ? `${id}-titulo` : undefined} className="text-[0.95rem] font-semibold text-navy-900">
                {titulo}
              </h2>
            )}
            {descricao && <p className="mt-0.5 text-sm text-navy-900/65">{descricao}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {acoes}
            {verTodos && (
              <Link
                href={verTodos.href}
                className="inline-flex items-center gap-1 rounded text-sm font-medium text-azul-500 hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
              >
                {verTodos.rotulo ?? "Ver tudo"}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
      <div className={cn("min-w-0 flex-1", !flush && "p-5")}>{children}</div>
    </section>
  );
}

/** Lista de pares rótulo/valor (dados de um registro). Valor vazio vira "Não informado", não some. */
export function ListaDefinicao({
  itens,
  colunas = 2,
  className,
}: {
  itens: { rotulo: string; valor: ReactNode; largo?: boolean }[];
  colunas?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        colunas === 2 && "sm:grid-cols-2",
        colunas === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {itens.map((item) => (
        <div key={item.rotulo} className={cn("min-w-0", item.largo && "sm:col-span-full")}>
          <dt className="text-xs font-medium text-navy-900/65">{item.rotulo}</dt>
          <dd className="mt-0.5 text-sm break-words text-navy-900">
            {item.valor === null || item.valor === undefined || item.valor === "" ? <span className="text-navy-900/65">Não informado</span> : item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}
