import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { Bell } from "lucide-react";
import Link from "next/link";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopbarTitle } from "./topbar-title";
import { FaixaContexto, TrocaDePerfil } from "./troca-de-perfil";
import { UserMenu } from "./user-menu";

// Redirect e conveniencia de navegacao; o dado continua protegido pela RLS via withUser mesmo
// que uma tela esqueca de checar a sessao (RF003). Sidebar e topbar seguem a identidade "Navy
// Confiança"; a navegacao le do mesmo registro NAVEGACAO usado pelas rotas em construcao, para
// nunca discordar da tela. Estrutura do shell (sidebar colapsavel, largura de icone, drawer no
// mobile, topbar de altura fixa alinhada ao cabecalho da sidebar) segue o padrao mapeado nos
// CRMs de referencia.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // RF002: nothing but the change screen while a temporary password is in use
  if (session.user.trocaSenhaObrigatoria) redirect("/trocar-senha");

  const vinculos = await listPerfisVigentes(session.identity);
  const perfis = vinculos.map((vinculo) => vinculo.perfil);
  const rotulosPerfis = perfis.map((perfil) => ROTULO_PERFIL[perfil]);
  const { naoLidas } = await listNotificacoes(session.identity, { apenasNaoLidas: true, limite: 1 });
  // RF003: during a switch the profiles above are the viewed account's; the banner offers the switch
  const podeTrocarPerfil = !session.contexto && perfis.includes("ADMINISTRADOR");

  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      style={{ "--sidebar-width-icon": "5.125rem" } as CSSProperties}
    >
      {/* WCAG 2.4.1: first stop of the keyboard, so nobody tabs through the whole menu on every screen */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-navy-900 focus:shadow-elevated focus:ring-2 focus:ring-azul-500 focus:outline-none"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar perfis={perfis} naoLidas={naoLidas} />
      <SidebarInset>
        {session.contexto && (
          <FaixaContexto nome={session.user.nome} perfis={rotulosPerfis} nomeTitular={session.contexto.nomeTitular} rotulos={ROTULO_PERFIL} />
        )}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-navy-900/10 bg-white/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="h-6 w-px bg-navy-900/10" />
          <TopbarTitle />
          <div className="flex-1" />
          {podeTrocarPerfil && <TrocaDePerfil rotulos={ROTULO_PERFIL} />}
          <Link
            href="/notificacoes"
            aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
            className="relative inline-flex size-10 items-center justify-center rounded-lg text-navy-900/70 transition-colors hover:bg-nevoa-100 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
          >
            <Bell className="size-5" aria-hidden />
            {naoLidas > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-status-danger-text px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </Link>
          <UserMenu nome={session.user.nome} perfis={rotulosPerfis} emContexto={session.contexto !== null} />
        </header>
        {/* Sem bg proprio: o cartao branco so se destaca se a pagina atras for levemente
            tingida (nevoa-50 no body). Tres planos: sidebar navy, pagina tingida, cartao branco. */}
        <main id="conteudo" tabIndex={-1} className="w-full min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-8 md:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
