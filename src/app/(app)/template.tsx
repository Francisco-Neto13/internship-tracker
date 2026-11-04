// Remounts at each navigation (Next.js template convention), so the content that arrives fades in.
// CSS only, with no View Transition: the screen stays usable and nothing waits for the movement.
export default function ModeloDePagina({ children }: { children: React.ReactNode }) {
  return <div className="conteudo-pagina">{children}</div>;
}
