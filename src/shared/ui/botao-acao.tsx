"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "./button";
import { mensagemDaApi } from "./formulario-api";

// Botão de transição (suspender, ativar, assinar, eliminar...): faz POST numa rota /api/v1, que
// decide se é permitido. Quando a transição pede motivo ou tem consequência difícil de desfazer,
// abre um diálogo acessível (foco preso, Esc fecha, foco volta ao botão) em vez do
// window.prompt, que não se estiliza, não explica a consequência e some em alguns navegadores.

export function BotaoAcao({
  url,
  rotulo,
  corpo,
  pedirMotivo,
  confirmacao,
  variante = "outline",
  tamanho = "default",
  sucesso,
}: {
  url: string;
  rotulo: string;
  corpo?: Record<string, unknown>;
  /** Campo e pergunta, para transições que exigem justificativa. */
  pedirMotivo?: { campo: string; pergunta: string };
  /** Explica a consequência antes de agir (ações que não se desfazem). */
  confirmacao?: { titulo: string; descricao: string; confirmar?: string };
  variante?: "default" | "outline" | "destructive" | "ghost";
  tamanho?: "default" | "sm";
  /** Mensagem curta depois de concluir; a página é recarregada com o novo estado. */
  sucesso?: string;
}) {
  const router = useRouter();
  const idMotivo = useId();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  // Aberto sem Dialog.Trigger, o Radix não sabe para onde devolver o foco ao fechar
  const origemDoFoco = useRef<HTMLElement | null>(null);

  async function executar() {
    setErro(null);
    setAviso(null);
    const dados: Record<string, unknown> = { ...corpo };
    if (pedirMotivo) {
      if (!motivo.trim()) return setErro("Informe o motivo para continuar.");
      dados[pedirMotivo.campo] = motivo.trim();
    }
    setEnviando(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(dados).length > 0 ? JSON.stringify(dados) : undefined,
      });
      if (!response.ok) {
        setErro(await mensagemDaApi(response, "Não foi possível concluir."));
        return;
      }
      setAberto(false);
      setMotivo("");
      if (sucesso) setAviso(sucesso);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const precisaDialogo = Boolean(pedirMotivo || confirmacao);

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={variante}
        size={tamanho}
        disabled={enviando}
        onClick={() => (precisaDialogo ? (setErro(null), setAberto(true)) : void executar())}
      >
        {enviando && !aberto ? "Aguarde…" : rotulo}
      </Button>
      {!aberto && erro && (
        <span role="alert" className="max-w-md text-xs text-status-danger-text">
          {erro}
        </span>
      )}
      {aviso && (
        <span role="status" className="inline-flex items-center gap-1 text-xs text-status-ok-text">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {aviso}
        </span>
      )}

      {precisaDialogo && (
        <Dialog.Root open={aberto} onOpenChange={setAberto}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
            <Dialog.Content
              onOpenAutoFocus={() => {
                origemDoFoco.current = document.activeElement as HTMLElement | null;
              }}
              onCloseAutoFocus={(evento) => {
                evento.preventDefault();
                origemDoFoco.current?.focus();
              }}
              className="data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-navy-900/10 bg-white p-6 shadow-elevated focus:outline-none"
            >
              <Dialog.Title className="text-base font-semibold text-navy-900">{confirmacao?.titulo ?? rotulo}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm text-navy-900/65">
                {confirmacao?.descricao ?? pedirMotivo?.pergunta}
              </Dialog.Description>
              {pedirMotivo && (
                <div className="mt-4 flex flex-col gap-1.5">
                  <label htmlFor={idMotivo} className="text-sm font-medium text-navy-900">
                    {confirmacao ? pedirMotivo.pergunta : "Motivo"}
                  </label>
                  <textarea
                    id={idMotivo}
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-md border border-navy-900/20 px-3 py-2 text-sm text-navy-900 focus-visible:border-azul-500 focus-visible:ring-2 focus-visible:ring-azul-500/25 focus-visible:outline-none"
                  />
                </div>
              )}
              {erro && (
                <p role="alert" className="mt-3 text-sm text-status-danger-text">
                  {erro}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="button" variant={variante === "destructive" ? "destructive" : "default"} disabled={enviando} onClick={() => void executar()}>
                  {enviando ? "Aguarde…" : (confirmacao?.confirmar ?? rotulo)}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </span>
  );
}
