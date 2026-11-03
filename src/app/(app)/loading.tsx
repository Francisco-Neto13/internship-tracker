import { EsqueletoDePagina } from "@/shared/ui/esqueleto";

// Enquanto a página do servidor carrega, a área de conteúdo mostra a forma do que vem (Next.js
// loading convention); sidebar e topbar continuam no lugar.
export default function Carregando() {
  return <EsqueletoDePagina />;
}
