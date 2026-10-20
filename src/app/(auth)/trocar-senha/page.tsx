import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TrocarSenhaForm } from "./trocar-senha-form";

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// RF002: forced on first access with a temporary password (the (app) layout and
// authenticatedRoute send the user here), and open for a voluntary change afterwards
export default async function TrocarSenhaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { trocaSenhaObrigatoria, senhaProvisoriaExpiraEm } = session.user;

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="surface-card flex w-full max-w-md flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold text-navy-900">
          {trocaSenhaObrigatoria ? "Defina sua senha" : "Trocar senha"}
        </h1>
        {trocaSenhaObrigatoria && (
          <p className="text-sm text-navy-900/70">
            Você entrou com uma senha provisória. Defina uma senha própria para continuar
            {senhaProvisoriaExpiraEm && ` (a provisória vale até ${dataHora.format(senhaProvisoriaExpiraEm)})`}.
          </p>
        )}
        <TrocarSenhaForm obrigatoria={trocaSenhaObrigatoria} />
      </div>
    </section>
  );
}
