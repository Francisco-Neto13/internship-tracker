import Image from "next/image";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { LoginForm } from "./login-form";

const PILARES = [
  {
    titulo: "TCE digital",
    descricao: "Termo de compromisso, plano de atividades e apólice assinados dentro do sistema.",
  },
  {
    titulo: "Do início ao fim",
    descricao: "Frequência, relatórios, avaliação, afastamento, prorrogação e rescisão num só lugar.",
  },
  {
    titulo: "Cada perfil no seu recorte",
    descricao: "Seis perfis sobre a mesma base: a política de acesso decide o que cada um enxerga.",
  },
];

export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");

  return (
    <div className="grid flex-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Painel da marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <p className="text-[11px] font-medium tracking-[0.32em] text-white/40 uppercase">
          Plataforma de acompanhamento de estágios
        </p>

        <div className="-mt-12 flex flex-col items-center justify-center text-center">
          {/* Versão reversa do logotipo: a original é navy sobre claro e sumiria aqui */}
          <Image
            src="/logo-internship-tracker-reverso.png"
            alt="Internship Tracker"
            width={918}
            height={351}
            priority
            className="h-auto w-full max-w-md"
          />
          <p className="mt-10 max-w-md text-base leading-relaxed text-white/55">
            Estágio e atividades complementares formalizados em um só lugar — do termo de
            compromisso à integralização curricular.
          </p>
        </div>

        <div className="space-y-6">
          <ul className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {PILARES.map((pilar) => (
              <li key={pilar.titulo} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-azul-500" />
                  <span className="text-xs font-semibold tracking-wider text-white uppercase">
                    {pilar.titulo}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/45">{pilar.descricao}</p>
              </li>
            ))}
          </ul>

          <p className="text-xs text-white/30">
            Project Lab · 6 perfis · 36 regras de negócio · 70 requisitos funcionais
          </p>
        </div>
      </aside>

      {/* Painel de acesso */}
      <section className="relative flex items-center justify-center bg-nevoa-50 px-6 py-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-navy-900/15 to-transparent lg:hidden" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <span className="inline-flex items-center rounded-xl bg-navy-900 px-5 py-4">
              <Image
                src="/logo-internship-tracker-reverso.png"
                alt="Internship Tracker"
                width={918}
                height={351}
                priority
                className="h-8 w-auto"
              />
            </span>
          </div>

          <div className="surface-elevated p-8">
            <div className="mb-7 space-y-2">
              <p className="text-[11px] font-medium tracking-[0.18em] text-navy-900/45 uppercase">
                Acesso restrito
              </p>
              <h1 className="font-display text-3xl font-semibold text-navy-900">
                Entrar no{" "}
                <span className="bg-gradient-to-r from-navy-700 to-azul-500 bg-clip-text text-transparent">
                  Internship Tracker
                </span>
              </h1>
              <p className="text-sm text-navy-900/60">
                Cadastro próprio desabilitado: as contas são criadas pelo administrador (RF001).
              </p>
            </div>

            <LoginForm />

            <div className="divider-rule my-6" />

            <p className="text-center text-xs text-navy-900/50">
              Estudante, orientador, supervisor, coordenação, concedente ou administrador — o
              sistema reconhece o seu perfil ao entrar.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-navy-900/40">
            Problemas para acessar? Procure a coordenação do seu curso.
          </p>
        </div>
      </section>
    </div>
  );
}
