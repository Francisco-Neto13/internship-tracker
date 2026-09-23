"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Perfil } from "@/modules/acesso/schemas/perfil";
import { itensVisiveis, type NavItem } from "@/shared/ui/navigation";
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

/**
 * O href mais especifico que casa com a rota vence. Sem isto, "/administracao" e
 * "/administracao/cursos" acendem juntos — eram pai e filho aninhados, agora sao irmaos
 * no mesmo grupo, e dois itens destacados leem como defeito.
 */
function hrefAtivo(pathname: string, hrefs: string[]) {
  const candidatos = hrefs.filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return candidatos.sort((a, b) => b.length - a.length)[0];
}

function ItemDeMenu({
  item,
  ativo,
  onNavigate,
}: {
  item: NavItem;
  ativo: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={ativo} tooltip={item.titulo}>
        <Link href={item.href} onClick={onNavigate}>
          <Icon />
          <span className="truncate group-data-[collapsible=icon]:hidden">{item.titulo}</span>
          {item.status === "em-construcao" && (
            <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
              <span
                role="img"
                aria-label="em construção"
                title="Em construção"
                className="size-1.5 shrink-0 rounded-full bg-status-pending-text"
              />
            </SidebarMenuBadge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Agrupamento e so de apresentacao: NAVEGACAO continua uma lista plana (com
 * Administracao carregando seus filhos, ainda lidos direto por administracao/page.tsx
 * para os cards do hub). Aqui a Administracao vira mais um grupo com seus filhos soltos,
 * do mesmo jeito que os tres CRMs de referencia organizam a barra lateral em secoes.
 */
function agruparNavegacao(navegacao: NavItem[]) {
  const painel = navegacao.find((item) => item.href === "/dashboard");
  const administracao = navegacao.find((item) => item.href === "/administracao");
  const modulos = navegacao.filter((item) => item.href !== "/dashboard" && item.href !== "/administracao");

  const grupos: { titulo: string; itens: NavItem[] }[] = [];
  if (painel) grupos.push({ titulo: "Visão geral", itens: [painel] });
  if (modulos.length > 0) grupos.push({ titulo: "Módulos", itens: modulos });
  if (administracao) {
    grupos.push({
      titulo: "Administração",
      itens: [{ ...administracao, children: undefined }, ...(administracao.children ?? [])],
    });
  }
  return grupos;
}

export function AppSidebar({ perfis }: { perfis: Perfil[] }) {
  const navegacao = itensVisiveis(perfis);
  const grupos = agruparNavegacao(navegacao);
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const ativo = hrefAtivo(
    pathname,
    grupos.flatMap((grupo) => grupo.itens.map((item) => item.href)),
  );

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
        {/* Sem linha entre grupos: a respiracao (gap-5) separa melhor que um filete, que a
            4px do rotulo seguinte le como sublinhado dele. Padrao dos tres projetos. */}
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarMenu>
              {grupo.itens.map((item) => (
                <ItemDeMenu
                  key={item.href}
                  item={item}
                  ativo={item.href === ativo}
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
