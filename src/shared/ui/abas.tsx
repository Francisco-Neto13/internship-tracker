import Link from "next/link";
import { cn } from "./cn";

/**
 * Abas de uma página de registro, como links (?aba=): o servidor renderiza só a aba aberta,
 * o endereço é compartilhável e o "voltar" do navegador volta de aba. A contagem ao lado do
 * rótulo diz o que há dentro antes de abrir.
 */
export function Abas({
  abas,
  atual,
  caminho,
  consulta = {},
}: {
  abas: { chave: string; rotulo: string; contagem?: number | null }[];
  atual: string;
  caminho: string;
  consulta?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label="Seções" className="relative -mx-1 overflow-x-auto border-b border-navy-900/10">
      <ul className="flex min-w-max gap-1 px-1">
        {abas.map((aba, indice) => {
          const parametros = new URLSearchParams(
            Object.entries({ ...consulta, aba: indice === 0 ? undefined : aba.chave }).filter(([, v]) => v) as [string, string][],
          ).toString();
          const ativa = aba.chave === atual;
          return (
            <li key={aba.chave}>
              <Link
                href={parametros ? `${caminho}?${parametros}` : caminho}
                scroll={false}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 rounded-t-md px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
                  ativa
                    ? "font-medium text-navy-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-navy-700"
                    : "text-navy-900/60 hover:text-navy-900",
                )}
              >
                {aba.rotulo}
                {aba.contagem !== undefined && aba.contagem !== null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs tabular-nums",
                      ativa ? "bg-navy-700 text-white" : "bg-nevoa-100 text-navy-900/60",
                    )}
                  >
                    {aba.contagem}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
