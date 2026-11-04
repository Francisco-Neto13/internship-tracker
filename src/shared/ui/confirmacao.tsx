"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type RefObject } from "react";
import { Button } from "./button";

/**
 * Confirmation before an action of a single click, with what happens in words.
 *
 * Use it where undoing is expensive or impossible: ending a session, a final decision, a
 * signature, a rescission, changing someone's permissions. Do not use it on what one more click
 * reverses (marking a notification as read, recalculating): asking for everything teaches people
 * to confirm without reading, and the dialog stops protecting exactly where it matters.
 *
 * Controlled, because the trigger is often not a button of its own (a form submit, a menu item).
 * Cancel takes the initial focus: Enter on an open dialog must not perform the action.
 */
export function Confirmacao({
  aberto,
  aoMudarAberto,
  titulo,
  descricao,
  rotuloConfirmar,
  destrutiva = false,
  ocupado = false,
  origemDoFoco,
  aoConfirmar,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  destrutiva?: boolean;
  ocupado?: boolean;
  /** Where focus returns when the dialog was not opened by the element that had it. */
  origemDoFoco?: RefObject<HTMLElement | null>;
  aoConfirmar: () => void | Promise<void>;
}) {
  const cancelar = useRef<HTMLButtonElement>(null);
  const anterior = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudarAberto}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          role="alertdialog"
          data-testid="confirmacao"
          onOpenAutoFocus={(evento) => {
            anterior.current = document.activeElement as HTMLElement | null;
            evento.preventDefault();
            cancelar.current?.focus();
          }}
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            (origemDoFoco?.current ?? anterior.current)?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-navy-900/10 bg-white p-6 shadow-elevated focus:outline-none data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in"
        >
          <Dialog.Title className="text-base font-semibold text-navy-900">{titulo}</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-navy-900/65">{descricao}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Button ref={cancelar} type="button" variant="outline" disabled={ocupado} onClick={() => aoMudarAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" variant={destrutiva ? "destructive" : "default"} disabled={ocupado} onClick={() => void aoConfirmar()}>
              {ocupado ? "Aguarde..." : rotuloConfirmar}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
