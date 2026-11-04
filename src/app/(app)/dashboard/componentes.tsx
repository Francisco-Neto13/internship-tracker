import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/ui/cn";

// Peças do painel: linhas de lista compactas (quem, o quê, quando, para onde ir) e a
// distribuição dos estágios por situação. Só apresentação; os números vêm de dados.ts.

export function ListaCompacta({ children, vazio }: { children: ReactNode[]; vazio: string }) {
  if (children.length === 0) return <p className="px-5 py-8 text-center text-sm text-navy-900/65">{vazio}</p>;
  return <ul className="divide-y divide-navy-900/[0.07]">{children}</ul>;
}

export function LinhaCompacta({
  href,
  titulo,
  subtitulo,
  lateral,
  avatar,
}: {
  href?: string;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  lateral?: ReactNode;
  avatar?: { nome: string | null; semente: string; forma?: "circulo" | "quadrado" };
}) {
  const conteudo = (
    <>
      {avatar && <Avatar nome={avatar.nome} semente={avatar.semente} tamanho="sm" forma={avatar.forma} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-900">{titulo}</p>
        {subtitulo && <p className="truncate text-xs text-navy-900/65">{subtitulo}</p>}
      </div>
      {lateral && <div className="shrink-0 text-right text-xs text-navy-900/65">{lateral}</div>}
      {href && <ChevronRight className="size-4 shrink-0 text-navy-900/30" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-nevoa-50 focus-visible:bg-nevoa-50 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none focus-visible:ring-inset"
        >
          {conteudo}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3">{conteudo}</div>
      )}
    </li>
  );
}

const SITUACOES = [
  { chave: "EM_FORMALIZACAO", rotulo: "Em formalização", cor: "bg-[#c99a4a]" },
  { chave: "ATIVO", rotulo: "Ativos", cor: "bg-azul-500" },
  { chave: "CONCLUIDO", rotulo: "Concluídos", cor: "bg-status-ok-text" },
  { chave: "RESCINDIDO", rotulo: "Rescindidos", cor: "bg-navy-900/35" },
] as const;

/** Estágios por situação: uma barra só (proporção) e a legenda com o número e o link filtrado. */
export function DistribuicaoEstagios({ contagens }: { contagens: Record<string, number | null> }) {
  const valores = SITUACOES.map((situacao) => ({ ...situacao, valor: contagens[situacao.chave] ?? 0 }));
  const total = valores.reduce((soma, item) => soma + item.valor, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-[1.75rem] leading-none font-semibold text-navy-900 tabular-nums">{total.toLocaleString("pt-BR")}</span>
        <span className="text-sm text-navy-900/65">estágios no seu alcance</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-nevoa-100" role="img" aria-label={valores.map((item) => `${item.rotulo}: ${item.valor}`).join(", ")}>
        {total > 0 && valores.map((item) => item.valor > 0 && <div key={item.chave} className={item.cor} style={{ width: `${(item.valor / total) * 100}%` }} />)}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {valores.map((item) => (
          <li key={item.chave}>
            <Link
              href={`/estagios?situacao=${item.chave}`}
              className="flex flex-col rounded-lg px-2 py-1.5 transition-colors hover:bg-nevoa-50 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
            >
              <span className="flex items-center gap-1.5 text-xs text-navy-900/65">
                <span className={cn("size-2 rounded-full", item.cor)} aria-hidden />
                {item.rotulo}
              </span>
              <span className="text-lg font-semibold text-navy-900 tabular-nums">{item.valor.toLocaleString("pt-BR")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
