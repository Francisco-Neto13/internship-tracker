import { cn } from "./cn";

// Capa de um curso sem imagem cadastrada (o modelo não tem campo de imagem de curso): o código
// em destaque sobre um tom estável derivado do id, da mesma família do Avatar. Reconhecível de
// relance numa grade e sem depender de upload. Quando houver imagem, ela entra no lugar.

const TONS = ["bg-[#1e3a5f]", "bg-[#1d5b47]", "bg-[#6b4410]", "bg-[#4a3577]", "bg-[#7d2e3c]", "bg-[#2b5566]"];

function tomDe(semente: string) {
  let soma = 0;
  for (const caractere of semente) soma = (soma * 31 + caractere.charCodeAt(0)) >>> 0;
  return TONS[soma % TONS.length];
}

export function CapaCurso({ codigo, semente, className }: { codigo: string; semente: string; className?: string }) {
  return (
    <div aria-hidden className={cn("relative flex h-24 items-end overflow-hidden rounded-t-xl px-5 pb-3", tomDe(semente), className)}>
      <span aria-hidden data-decorativo className="absolute -top-3 -right-2 font-mono text-[5.5rem] leading-none font-bold text-white/[0.08] select-none">{codigo.slice(0, 3)}</span>
      <span className="relative font-mono text-sm font-semibold tracking-wide text-white">{codigo}</span>
    </div>
  );
}
