"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

// Diálogo para criar um registro sem tirar a pessoa da listagem (cadastrar estudante, usuário,
// curso...). Radix cuida do foco preso, do Esc e de devolver o foco ao botão que abriu. O
// formulário dentro chama useFecharDialogo() ao concluir.

const Fechar = createContext<() => void>(() => {});
export const useFecharDialogo = () => useContext(Fechar);

export function Dialogo({
  gatilho,
  titulo,
  descricao,
  children,
  largura = "md",
}: {
  gatilho: { rotulo: string; icone?: ReactNode; variante?: "default" | "outline" };
  titulo: string;
  descricao?: string;
  children: ReactNode;
  largura?: "md" | "lg";
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger asChild>
        <Button variant={gatilho.variante ?? "default"}>
          {gatilho.icone}
          {gatilho.rotulo}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          className={cn(
            "data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-navy-900/10 bg-white shadow-elevated focus:outline-none",
            largura === "md" ? "max-w-lg" : "max-w-2xl",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-navy-900/[0.07] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-navy-900">{titulo}</Dialog.Title>
              {descricao ? (
                <Dialog.Description className="mt-1 text-sm text-navy-900/65">{descricao}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1 text-navy-900/65 hover:bg-nevoa-100 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none" aria-label="Fechar">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            <Fechar.Provider value={() => setAberto(false)}>{children}</Fechar.Provider>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
