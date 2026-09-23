"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function iniciaisDoNome(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function UserMenu({ nome, perfis }: { nome: string; perfis: string[] }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function signOut() {
    setSaindo(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const iniciais = iniciaisDoNome(nome);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 outline-none transition-colors hover:bg-nevoa-100 focus-visible:ring-2 focus-visible:ring-azul-500/40">
        <span className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-[11px] font-semibold text-white ring-1 ring-black/10">
          {iniciais}
        </span>
        <span
          data-testid="usuario-autenticado"
          className="hidden max-w-[10rem] truncate text-sm font-medium text-navy-900 lg:block"
        >
          {nome}
        </span>
        <ChevronDown className="size-3.5 text-navy-900/40 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0">
        <div className="flex items-center gap-3 border-b border-navy-900/10 px-4 py-3.5">
          <span className="inline-grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-sm font-semibold text-white ring-1 ring-black/10">
            {iniciais}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900">{nome}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {perfis.map((perfil) => (
                <span
                  key={perfil}
                  className="rounded-full bg-nevoa-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-navy-700 uppercase ring-1 ring-navy-900/10"
                >
                  {perfil}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="p-1">
          <DropdownMenuItem
            variant="destructive"
            disabled={saindo}
            onSelect={signOut}
            className="gap-2.5 px-3 py-2 text-sm font-medium"
          >
            <LogOut className="size-4" />
            {saindo ? "Saindo…" : "Sair"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
