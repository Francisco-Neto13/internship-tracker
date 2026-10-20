"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./button";
import { mensagemDaApi } from "./formulario-api";

// A state transition button (suspend, activate, sign...): POSTs to an /api/v1 route, asking
// for a reason first when the transition requires one. The API decides if it is allowed.

export function BotaoAcao({
  url,
  rotulo,
  corpo,
  pedirMotivo,
  variante = "outline",
}: {
  url: string;
  rotulo: string;
  corpo?: Record<string, unknown>;
  /** Field name and prompt text, for transitions that require a reason. */
  pedirMotivo?: { campo: string; pergunta: string };
  variante?: "default" | "outline" | "destructive";
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function executar() {
    setErro(null);
    const dados: Record<string, unknown> = { ...corpo };
    if (pedirMotivo) {
      const motivo = window.prompt(pedirMotivo.pergunta)?.trim();
      if (!motivo) return;
      dados[pedirMotivo.campo] = motivo;
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
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="flex flex-col gap-1">
      <Button type="button" variant={variante} disabled={enviando} onClick={() => void executar()}>
        {enviando ? "Aguarde..." : rotulo}
      </Button>
      {erro && (
        <span role="alert" className="max-w-md text-xs text-status-danger-text">
          {erro}
        </span>
      )}
    </span>
  );
}
