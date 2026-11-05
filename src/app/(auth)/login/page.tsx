import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { LoginForm } from "./login-form";
import { PercursoEstagio } from "./percurso-estagio";

// A tela mostra o que o sistema é: o percurso do estágio, de cima a baixo no celular e de ponta a
// ponta no computador, com o formulário sobre ele. O formulário vem primeiro no documento, então
// quem usa teclado ou leitor de tela chega a ele antes de tudo, e no celular ele é o que se vê
// ao abrir.
export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col bg-nevoa-50">
      <header className="order-1 bg-navy-900 px-6 pt-6 pb-20 lg:px-12 lg:pt-5 lg:pb-4">
        <div className="mx-auto w-full max-w-6xl">
          {/* Versão reversa do logotipo: a original é navy sobre claro e sumiria aqui */}
          <Image src="/logo-internship-tracker-reverso.png" alt="Internship Tracker" width={918} height={351} priority className="h-10 w-auto lg:h-9" />
        </div>
      </header>

      <section aria-labelledby="titulo-login" className="relative z-10 order-2 -mt-14 px-4 pb-10 lg:order-3 lg:-mt-14 lg:pb-8">
        <div className="surface-elevated mx-auto w-full max-w-md animate-surgir p-6 sm:p-7">
          <h1 id="titulo-login" className="font-display text-2xl font-semibold text-navy-900">
            Entrar no Internship Tracker
          </h1>
          <p className="mt-1 mb-5 text-sm text-navy-900/65">Use o e-mail e a senha da sua conta.</p>
          <LoginForm />
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <Link href="/recuperar-senha" className="w-fit rounded text-azul-500 hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none">
              Esqueceu a senha?
            </Link>
            <p className="text-navy-900/65">As contas são criadas pela administração.</p>
          </div>
        </div>
      </section>

      <section aria-label="O percurso do estágio" className="order-3 flex-1 bg-navy-900 px-6 py-10 lg:order-2 lg:flex-none lg:px-12 lg:pt-1 lg:pb-20">
        <PercursoEstagio />
      </section>
    </main>
  );
}
