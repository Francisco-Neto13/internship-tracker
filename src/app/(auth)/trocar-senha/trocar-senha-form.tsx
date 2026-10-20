"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

// The API validates again (src/modules/acesso/schemas/senha.ts); these checks only spare a round trip
const MINIMO = 15;

export function TrocarSenhaForm({ obrigatoria }: { obrigatoria: boolean }) {
  const router = useRouter();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    if (nova.length < MINIMO) return setErro(`A nova senha precisa ter ao menos ${MINIMO} caracteres.`);
    if (nova !== confirmacao) return setErro("A confirmação não confere com a nova senha.");

    setEnviando(true);
    try {
      const response = await fetch("/api/v1/auth/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha_atual: atual, nova_senha: nova }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detalhe = body?.error?.details?.[0]?.issue;
        setErro(detalhe ?? body?.error?.message ?? "Não foi possível trocar a senha.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function sair() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-atual">{obrigatoria ? "Senha provisória" : "Senha atual"}</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(event) => setAtual(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-nova">Nova senha</Label>
        <Input
          id="senha-nova"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(event) => setNova(event.target.value)}
        />
        <p className="text-xs text-navy-900/60">Ao menos {MINIMO} caracteres. Uma frase longa é mais fácil de lembrar.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-confirmacao">Confirme a nova senha</Label>
        <Input
          id="senha-confirmacao"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar nova senha"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void sair()}>
          Sair
        </Button>
      </div>
    </form>
  );
}
