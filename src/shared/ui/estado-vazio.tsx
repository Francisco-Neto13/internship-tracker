import { AlertTriangle, Inbox, Lock, SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

type EstadoVazioVariante = "vazio" | "sem-resultados" | "sem-permissao" | "indisponivel" | "erro";

const CONFIG: Record<EstadoVazioVariante, { icon: LucideIcon; tom: string }> = {
  vazio: { icon: Inbox, tom: "bg-nevoa-100 text-navy-700" },
  "sem-resultados": { icon: SearchX, tom: "bg-nevoa-100 text-navy-700" },
  "sem-permissao": { icon: Lock, tom: "bg-nevoa-100 text-navy-900/65" },
  indisponivel: { icon: AlertTriangle, tom: "bg-status-pending-bg text-status-pending-text" },
  erro: { icon: AlertTriangle, tom: "bg-status-danger-bg text-status-danger-text" },
};

/**
 * Os cinco motivos para não haver o que mostrar, cada um com o próprio texto: não há registros
 * ainda (com o primeiro passo), a busca não encontrou nada (com como limpar), o perfil não
 * alcança (a RLS funcionando, não um defeito), a fonte não existe no sistema, ou deu erro.
 * Carregamento fica com loading.tsx; erro inesperado de página, com error.tsx.
 */
export function EstadoVazio({
  variante = "vazio",
  titulo,
  descricao,
  acao,
  compacto = false,
  className,
}: {
  variante?: EstadoVazioVariante;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
  className?: string;
}) {
  const { icon: Icon, tom } = CONFIG[variante];
  return (
    <div
      role={variante === "erro" ? "alert" : undefined}
      className={cn(
        "animate-surgir flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-900/15 bg-white/60 px-6 text-center",
        compacto ? "py-8" : "py-14",
        className,
      )}
    >
      <span className={cn("flex size-11 items-center justify-center rounded-full", tom)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-navy-900">{titulo}</p>
        {descricao && <p className="mx-auto max-w-md text-sm text-navy-900/65">{descricao}</p>}
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
}
