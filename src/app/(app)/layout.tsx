import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopbarTitle } from "./topbar-title";
import { UserMenu } from "./user-menu";

// Redirect e conveniencia de navegacao; o dado continua protegido pela RLS via withUser mesmo
// que uma tela esqueca de checar a sessao (RF003). Sidebar e topbar seguem a identidade "Navy
// Confiança"; a navegacao le do mesmo registro NAVEGACAO usado pelas rotas em construcao, para
// nunca discordar da tela. Estrutura do shell (sidebar colapsavel, largura de icone, drawer no
// mobile, topbar de altura fixa alinhada ao cabecalho da sidebar) segue o padrao mapeado nos
// CRMs de referencia (shadcn "sidebar-07").
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const vinculos = await listPerfisVigentes(session.identity);
  const perfis = vinculos.map((vinculo) => vinculo.perfil);
  const rotulosPerfis = perfis.map((perfil) => ROTULO_PERFIL[perfil]);

  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      style={{ "--sidebar-width-icon": "5.125rem" } as CSSProperties}
    >
      <AppSidebar perfis={perfis} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-navy-900/10 bg-white/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="h-6 w-px bg-navy-900/10" />
          <TopbarTitle />
          <div className="flex-1" />
          <UserMenu nome={session.user.nome} perfis={rotulosPerfis} />
        </header>
        {/* Sem bg proprio: o cartao branco so se destaca se a pagina atras for levemente
            tingida (nevoa-50 no body). Tres planos: sidebar navy, pagina tingida, cartao branco. */}
        <main className="animate-fade-in flex-1 px-4 py-8 md:px-6 md:py-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
