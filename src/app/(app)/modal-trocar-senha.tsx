"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, X } from "lucide-react";
import { useState, type RefObject } from "react";
import { TrocarSenhaForm } from "@/app/(auth)/trocar-senha/trocar-senha-form";
import { Button } from "@/shared/ui/button";

// RF002: voluntary change without leaving the page. The forced change of a temporary password
// keeps its own screen (/trocar-senha), because nothing else is reachable until it happens.
export function ModalTrocarSenha({
  aberto,
  aoMudarAberto,
  origemDoFoco,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  origemDoFoco: RefObject<HTMLElement | null>;
}) {
  const [concluido, setConcluido] = useState(false);

  function mudarAberto(proximo: boolean) {
    aoMudarAberto(proximo);
    if (proximo) setConcluido(false);
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={mudarAberto}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          data-testid="modal-trocar-senha"
          // Opened from the menu, not from a Dialog.Trigger: Radix has no button to return to
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            origemDoFoco.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-navy-900/10 bg-white shadow-elevated focus:outline-none data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in"
        >
          <div className="flex items-start justify-between gap-4 border-b border-navy-900/[0.07] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-navy-900">Trocar senha</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-navy-900/65">
                Ao salvar, as suas outras sessões abertas são encerradas.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="rounded-md p-1 text-navy-900/65 hover:bg-nevoa-100 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            {concluido ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
                <CheckCircle2 className="size-10 text-status-ok-text" aria-hidden />
                <p className="font-medium text-navy-900">Senha alterada</p>
                <p className="text-sm text-navy-900/65">Use a nova senha no próximo acesso.</p>
                <Dialog.Close asChild>
                  <Button className="mt-2">Fechar</Button>
                </Dialog.Close>
              </div>
            ) : (
              <TrocarSenhaForm obrigatoria={false} aoConcluir={() => setConcluido(true)} aoCancelar={() => mudarAberto(false)} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
