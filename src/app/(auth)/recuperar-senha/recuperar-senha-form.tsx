"use client";

import { useState } from "react";
import { z } from "zod";
import { LIMITE } from "@/lib/campos";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const email = z.email();

export function RecuperarSenhaForm() {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    const informado = valor.trim();
    if (!email.safeParse(informado).success) return setErro("Informe um e-mail válido.");
    setEnviando(true);
    try {
      const resposta = await fetch("/api/auth/recuperacao-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: informado }),
      });
      if (resposta.status === 429) return setErro("Muitos pedidos seguidos. Aguarde um minuto e tente de novo.");
      if (!resposta.ok) return setErro("Não foi possível registrar o pedido. Tente de novo em instantes.");
      setEnviado(true);
    } catch {
      setErro("Não foi possível registrar o pedido. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    // The same words for any e-mail, so the screen does not tell which accounts exist
    return (
      <p role="status" className="text-sm text-navy-900">
        Pedido registrado. Se houver uma conta ativa com esse e-mail, a administração foi avisada. A senha provisória não chega por
        e-mail: ela é entregue diretamente a você.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recuperar-email">E-mail</Label>
        <Input id="recuperar-email" type="email" autoComplete="username" maxLength={LIMITE.email} value={valor} onChange={(evento) => setValor(evento.target.value)} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={enviando} className="h-11 w-full">
        {enviando ? "Enviando..." : "Pedir senha provisória"}
      </Button>
    </form>
  );
}
