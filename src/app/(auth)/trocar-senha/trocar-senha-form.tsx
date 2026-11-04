"use client";

import { ErroCampo } from "@/shared/ui/use-validacao";
import { SENHA_MAXIMO, SENHA_MINIMO } from "@/lib/campos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { CampoSenha } from "@/shared/ui/campo-senha";
import { Label } from "@/shared/ui/label";

// The API validates again (src/modules/acesso/schemas/senha.ts); these checks only spare a round trip

export function TrocarSenhaForm({
  obrigatoria,
  aoConcluir,
  aoCancelar,
}: {
  obrigatoria: boolean;
  /** Inside the modal: stays on the page instead of going to the dashboard. */
  aoConcluir?: () => void;
  aoCancelar?: () => void;
}) {
  const router = useRouter();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [saiuDaNova, setSaiuDaNova] = useState(false);
  const [saiuDaConfirmacao, setSaiuDaConfirmacao] = useState(false);
  const erroNova =
    !saiuDaNova || !nova
      ? undefined
      : nova.length < SENHA_MINIMO
        ? `A nova senha precisa ter ao menos ${SENHA_MINIMO} caracteres`
        : nova.length > SENHA_MAXIMO
          ? `A nova senha pode ter no máximo ${SENHA_MAXIMO} caracteres`
          : undefined;
  const erroConfirmacao = saiuDaConfirmacao && confirmacao && nova !== confirmacao ? "A confirmação não confere com a nova senha" : undefined;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    if (nova.length < SENHA_MINIMO) return setErro(`A nova senha precisa ter ao menos ${SENHA_MINIMO} caracteres.`);
    if (nova.length > SENHA_MAXIMO) return setErro(`A nova senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`);
    if (atual.length > SENHA_MAXIMO) return setErro("A senha atual está incorreta.");
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
      if (aoConcluir) return aoConcluir();
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
        <CampoSenha
          id="senha-atual"
          autoComplete="current-password"
          value={atual}
          onChange={(event) => setAtual(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-nova">Nova senha</Label>
        <CampoSenha
          id="senha-nova"
          autoComplete="new-password"
          value={nova}
          onChange={(event) => setNova(event.target.value)}
          onBlur={() => setSaiuDaNova(true)}
          aria-invalid={Boolean(erroNova)}
          aria-describedby="senha-nova-erro"
        />
        <ErroCampo id="senha-nova-erro" mensagem={erroNova} />
        {/* NIST SP 800-63B-4 3.1.1.2: the verifier SHALL offer guidance to choose a strong password */}
        <p className="text-xs text-navy-900/65">
          De {SENHA_MINIMO} a {SENHA_MAXIMO} caracteres; espaços e acentos valem. Prefira uma frase só sua, fácil de lembrar. Não use o seu
          nome, o seu e-mail, o nome do sistema nem uma senha que você já usa em outro lugar: senhas que aparecem em
          vazamentos de dados são recusadas.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-confirmacao">Confirme a nova senha</Label>
        <CampoSenha
          id="senha-confirmacao"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          onBlur={() => setSaiuDaConfirmacao(true)}
          aria-invalid={Boolean(erroConfirmacao)}
          aria-describedby="senha-confirmacao-erro"
        />
        <ErroCampo id="senha-confirmacao-erro" mensagem={erroConfirmacao} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" carregando={enviando}>
          {enviando ? "Salvando..." : "Salvar nova senha"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => (aoCancelar ? aoCancelar() : void sair())}>
          {aoCancelar ? "Cancelar" : "Sair"}
        </Button>
      </div>
    </form>
  );
}
