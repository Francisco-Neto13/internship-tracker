import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { LoginForm } from "./login-form";
import { PercursoEstagio } from "./percurso-estagio";

// A tela inteira é uma superfície só: a mensagem e os perfis de um lado, o formulário do outro e o
// percurso do estágio de ponta a ponta na base. O formulário vem antes no documento, então quem usa
// teclado ou leitor de tela chega a ele primeiro, e no celular ele é o que se vê ao abrir.
export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");

  return (
    <main className="flex flex-1 bg-navy-900">
      {/* Sem largura máxima: colunas, título e cartão crescem com a tela, para não sobrar vão em monitor grande */}
      <div className="grid min-h-dvh w-full grid-cols-1 gap-x-16 gap-y-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[auto_1fr_auto] lg:px-12 lg:py-7 2xl:gap-x-24 2xl:px-[5vw] min-[106rem]:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] min-[137rem]:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
        <header className="px-2 sm:px-0 lg:col-start-1 lg:row-start-1">
          {/* Versão reversa do logotipo: a original é navy sobre claro e sumiria aqui */}
          <Image src="/logo-internship-tracker-reverso.png" alt="Internship Tracker" width={918} height={351} priority className="h-10 w-auto xl:h-12 min-[106rem]:h-14 min-[137rem]:h-20" />
        </header>

        {/* Em tela baixa o cartão usa também a altura do logotipo; com altura sobrando, centra junto com o título */}
        <section aria-labelledby="titulo-login" className="w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center [@media(min-height:800px)]:lg:row-span-1 [@media(min-height:800px)]:lg:row-start-2">
          <div className="surface-elevated mx-auto w-full max-w-md animate-surgir p-6 sm:p-7 lg:max-w-none min-[106rem]:[zoom:1.15] min-[137rem]:[zoom:1.35]">
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

        <PercursoEstagio />
      </div>
    </main>
  );
}
