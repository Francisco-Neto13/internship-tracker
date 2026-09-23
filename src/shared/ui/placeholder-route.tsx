import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { EmConstrucao } from "./em-construcao";
import { encontrarItem } from "./navigation";
import { PageHeader } from "./page-header";

/** Shared body for every route whose module is not implemented yet; keeps the menu and the
 * screen reading from the same NAVEGACAO entry instead of duplicating title and RF. */
export async function renderizarPlaceholder(href: string) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const item = encontrarItem(href);
  if (!item) throw new Error(`Item de navegacao nao encontrado: ${href}`);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={item.titulo} description={item.descricao} />
      <EmConstrucao item={item} />
    </section>
  );
}
