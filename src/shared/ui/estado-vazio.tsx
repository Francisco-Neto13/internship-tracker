import { AlertTriangle, Inbox, Lock, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

type EstadoVazioVariante = "vazio" | "sem-permissao" | "indisponivel";

const CONFIG: Record<EstadoVazioVariante, { icon: LucideIcon; tom: string }> = {
  vazio: { icon: Inbox, tom: "text-navy-900/35" },
  "sem-permissao": { icon: Lock, tom: "text-navy-900/35" },
  indisponivel: { icon: AlertTriangle, tom: "text-status-danger-text" },
};

/**
 * Estado alternativo a lista vazia. Server Components ja cobrem carregando (loading.tsx) e
 * erro inesperado (error.tsx) pelas convencoes do Next; este componente cobre os 3 motivos de
 * uma lista chegar vazia mesmo sem erro: zero registros, RLS restringindo o alcance do perfil
 * (nao e bug, e a politica funcionando) e indisponibilidade sinalizada explicitamente pela tela.
 */
export function EstadoVazio({
  variante = "vazio",
  titulo,
  descricao,
  className,
}: {
  variante?: EstadoVazioVariante;
  titulo: string;
  descricao: string;
  className?: string;
}) {
  const { icon: Icon, tom } = CONFIG[variante];
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-navy-900/10 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className={cn("size-8", tom)} />
      <p className="font-display text-sm font-semibold text-navy-900">{titulo}</p>
      <p className="max-w-sm text-sm text-navy-900/60">{descricao}</p>
    </div>
  );
}
