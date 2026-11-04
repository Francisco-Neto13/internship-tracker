import type { Metadata } from "next";
import Link from "next/link";
import { RecuperarSenhaForm } from "./recuperar-senha-form";

export const metadata: Metadata = { title: "Esqueceu a senha" };

// RF002: sem e-mail. O pedido avisa a administração dentro do sistema, e a senha provisória é
// entregue por fora dele, depois de confirmar quem pediu.
export default function RecuperarSenhaPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="surface-card flex w-full max-w-md flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold text-navy-900">Esqueceu a senha?</h1>
        <p className="text-sm text-navy-900/70">
          Informe o e-mail da sua conta. A administração recebe o pedido e, depois de confirmar que é você, entrega uma senha
          provisória válida por 72 horas.
        </p>
        <RecuperarSenhaForm />
        <Link href="/login" className="w-fit rounded text-sm text-azul-500 hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none">
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
