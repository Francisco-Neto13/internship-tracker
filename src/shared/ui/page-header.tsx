import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Cabeçalho de toda página autenticada: de onde se veio (voltar), o que é a página, o contexto
 * em uma linha e as ações principais à direita. Um só componente para que título, ação e
 * caminho de volta fiquem sempre no mesmo lugar, em qualquer módulo.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  voltar,
  acoes,
  meta,
  identidade,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Volta para a listagem preservando a consulta (filtros e página) em `href`. */
  voltar?: { href: string; rotulo: string };
  acoes?: ReactNode;
  /** Linha de selos e dados curtos abaixo do título (situação, período, contagens). */
  meta?: ReactNode;
  /** Avatar ou capa ao lado do título, em páginas de um registro (pessoa, concedente, curso). */
  identidade?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {voltar && (
        <Link
          href={voltar.href}
          className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-navy-900/60 transition-colors hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {identidade && <div className="shrink-0">{identidade}</div>}
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-xs font-medium tracking-wide text-azul-500">
                {eyebrow}
              </p>
            )}
            <h1 className="text-[1.65rem] leading-tight font-semibold break-words text-navy-900">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-3xl text-sm text-navy-900/65">
                {description}
              </p>
            )}
            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-navy-900/70">
                {meta}
              </div>
            )}
          </div>
        </div>
        {acoes && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {acoes}
          </div>
        )}
      </div>
    </header>
  );
}
