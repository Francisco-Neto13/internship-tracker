"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Perfil } from "@/modules/acesso/schemas/perfil";
import { encontrarItem, gruposVisiveis, type NavItem } from "@/shared/ui/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar";

function ItemDeMenu({ item, ativo, contagem, onNavigate }: { item: NavItem; ativo: boolean; contagem?: number; onNavigate: () => void }) {
  const Icon = item.icon;
  const rotulo = item.curto ?? item.titulo;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={ativo} tooltip={item.titulo}>
        <Link href={item.href} onClick={onNavigate} aria-current={ativo ? "page" : undefined}>
          <Icon />
          <span className="truncate group-data-[collapsible=icon]:hidden">{rotulo}</span>
          {contagem ? (
            <SidebarMenuBadge className="rounded-full bg-white/15 px-1.5 text-[11px] tabular-nums group-data-[collapsible=icon]:hidden">
              <span aria-label={`${contagem} não lidas`}>{contagem > 99 ? "99+" : contagem}</span>
            </SidebarMenuBadge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Barra lateral por área de trabalho (Estágios, Formação, Acadêmico, Parcerias, Administração)
 * em vez de "Módulos" e "Administração": cada perfil vê só os grupos em que tem o que fazer, e o
 * item ativo é o da rota mais específica, inclusive dentro de um registro.
 */
export function AppSidebar({ perfis, naoLidas }: { perfis: Perfil[]; naoLidas: number }) {
  const grupos = gruposVisiveis(perfis);
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const ativo = encontrarItem(pathname)?.href;

  function onNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-1 py-1 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
            <Image src="/logo-internship-tracker.png" alt="" width={24} height={24} priority />
          </span>
          <span className="truncate font-display text-sm font-semibold text-white group-data-[collapsible=icon]:hidden">
            Internship Tracker
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-4">
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.chave}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarMenu>
              {grupo.itens.map((item) => (
                <ItemDeMenu
                  key={item.href}
                  item={item}
                  ativo={item.href === ativo}
                  contagem={item.href === "/notificacoes" ? naoLidas : undefined}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
