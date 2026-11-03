import { cn } from "./cn";

// Sem foto cadastrada (o modelo não tem campo de imagem de pessoa nem de concedente), o avatar
// é a inicial sobre um tom estável derivado do id: a mesma pessoa tem sempre a mesma cor em
// qualquer tela, o que ajuda a reconhecer alguém numa lista longa. Os tons são da família
// navy/azul da identidade com quatro vizinhos discretos, todos com texto em contraste AA.

const TONS = [
  "bg-[#dbe6f3] text-[#1e3a5f]",
  "bg-[#d9ece6] text-[#1d5b47]",
  "bg-[#f3e6d4] text-[#7a4b12]",
  "bg-[#e7e1f2] text-[#4a3577]",
  "bg-[#f2dfe2] text-[#7d2e3c]",
  "bg-[#dfe9ee] text-[#2b5566]",
];

const TAMANHOS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

function tomDe(semente: string) {
  let soma = 0;
  for (const caractere of semente) soma = (soma * 31 + caractere.charCodeAt(0)) >>> 0;
  return TONS[soma % TONS.length];
}

export function iniciais(nome: string | null | undefined) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primeira}${ultima}`.toUpperCase();
}

export function Avatar({
  nome,
  semente,
  tamanho = "md",
  forma = "circulo",
  className,
}: {
  nome: string | null | undefined;
  /** Id do registro: mantém a cor estável mesmo quando o nome muda. */
  semente?: string;
  tamanho?: keyof typeof TAMANHOS;
  /** Pessoas em círculo; instituições (concedente, curso) em quadrado arredondado. */
  forma?: "circulo" | "quadrado";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold select-none",
        forma === "circulo" ? "rounded-full" : "rounded-lg",
        TAMANHOS[tamanho],
        tomDe(semente ?? nome ?? "?"),
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
