"use client";

import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Confirmacao } from "@/shared/ui/confirmacao";
import { ModalTrocarSenha } from "./modal-trocar-senha";

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
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);

  async function signOut() {
    setSaindo(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const iniciais = iniciaisDoNome(nome);

  return (
    <>
    {/* modal={false}: a modal menu would keep the page inert under the dialog it opens */}
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger ref={gatilho} className="group flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 outline-none transition-colors hover:bg-nevoa-100 focus-visible:ring-2 focus-visible:ring-azul-500/40">
        <span className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-navy-700 text-[11px] font-semibold text-white">
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
          <span className="inline-grid size-10 shrink-0 place-items-center rounded-full bg-navy-700 text-sm font-semibold text-white">
            {iniciais}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900">{nome}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {perfis.map((perfil) => (
                <span
                  key={perfil}
                  className="rounded-full bg-nevoa-100 px-2 py-0.5 text-xs font-medium text-navy-700"
                >
                  {perfil}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="p-1">
          <DropdownMenuItem onSelect={() => setTrocandoSenha(true)} className="gap-2.5 px-3 py-2 text-sm font-medium">
            <KeyRound className="size-4" />
            Trocar senha
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={saindo}
            onSelect={() => setConfirmandoSaida(true)}
            className="gap-2.5 px-3 py-2 text-sm font-medium"
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    <ModalTrocarSenha aberto={trocandoSenha} aoMudarAberto={setTrocandoSenha} origemDoFoco={gatilho} />
    <Confirmacao
      aberto={confirmandoSaida}
      aoMudarAberto={setConfirmandoSaida}
      titulo="Sair da conta?"
      descricao="Sua sessão será encerrada neste navegador, e o que não foi salvo nesta página será perdido. Para voltar, é preciso entrar de novo com e-mail e senha."
      rotuloConfirmar="Sair da conta"
      destrutiva
      ocupado={saindo}
      origemDoFoco={gatilho}
      aoConfirmar={signOut}
    />
    </>
  );
}
