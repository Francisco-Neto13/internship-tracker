"use client";

import { LIMITE } from "@/lib/campos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { mensagemDeErro, PerfisCampo, type OpcaoPerfil, type VinculoEscolhido } from "./perfis-campo";

// RF001: the temporary password is shown once, right after creation, to be handed over
// out of band (RF002). It is not stored anywhere readable and cannot be shown again.

export function UsuarioForm({
  catalogo,
  cursos,
  concedentes,
}: {
  catalogo: OpcaoPerfil[];
  cursos: { id: string; nome: string }[];
  concedentes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfis, setPerfis] = useState<VinculoEscolhido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [emitida, setEmitida] = useState<{ id: string; email: string; senha: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const response = await fetch("/api/v1/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, perfis }),
      });
      if (!response.ok) {
        setErro(await mensagemDeErro(response, "Não foi possível cadastrar o usuário."));
        return;
      }
      const { data } = await response.json();
      setEmitida({ id: data.id, email: data.email, senha: data.senha_provisoria });
      setNome("");
      setEmail("");
      setPerfis([]);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {emitida && (
        <div role="status" className="flex flex-col gap-1.5 rounded-lg border border-status-ok-text/30 bg-status-ok-bg p-4" data-testid="senha-provisoria">
          <p className="text-sm text-navy-900">
            Senha provisória de <strong>{emitida.email}</strong>, válida por 72 horas. Ela não será exibida de novo:
          </p>
          <code className="rounded bg-white px-2 py-1 font-mono text-lg break-all text-navy-900 select-all">{emitida.senha}</code>
          <p className="text-xs text-navy-900/65">No primeiro acesso, o usuário precisa definir uma senha própria. Entregue a senha fora do sistema.</p>
          <a href={`/administracao/usuarios/${emitida.id}`} className="w-fit text-sm font-medium text-azul-500 hover:text-navy-700">
            Abrir a conta criada →
          </a>
        </div>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usuario-nome">Nome</Label>
          <Input id="usuario-nome" maxLength={LIMITE.nomeUsuario} value={nome} onChange={(event) => setNome(event.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usuario-email">E-mail</Label>
          <Input id="usuario-email" type="email" maxLength={LIMITE.email} value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <PerfisCampo catalogo={catalogo} cursos={cursos} concedentes={concedentes} value={perfis} onChange={setPerfis} />
        </div>
        {erro && (
          <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
            {erro}
          </p>
        )}
        <Button type="submit" disabled={enviando} className="sm:col-span-2 sm:w-fit sm:justify-self-end">
          {enviando ? "Salvando..." : "Cadastrar usuário"}
        </Button>
      </form>
    </div>
  );
}
