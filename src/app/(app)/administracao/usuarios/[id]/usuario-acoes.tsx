"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { mensagemDeErro, PerfisCampo, type OpcaoPerfil, type VinculoEscolhido } from "../perfis-campo";

// RF001 actions on one user: edit data, replace the links in force, inactivate or
// reactivate. Each one calls the API; the page reloads its data afterwards.

type Props = {
  usuario: { id: string; nome: string; email: string; situacao: "ATIVO" | "INATIVO" };
  perfis: VinculoEscolhido[];
  catalogo: OpcaoPerfil[];
  cursos: { id: string; nome: string }[];
  concedentes: { id: string; nome: string }[];
};

export function UsuarioAcoes({ usuario, perfis: perfisIniciais, catalogo, cursos, concedentes }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [perfis, setPerfis] = useState(perfisIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(caminho: string, method: string, body: unknown, sucesso: string | ((data: { senha_provisoria?: string }) => string)) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/v1/usuarios/${usuario.id}${caminho}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        setErro(await mensagemDeErro(response, "Não foi possível concluir a operação."));
        return;
      }
      const { data } = await response.json();
      setAviso(typeof sucesso === "function" ? sucesso(data) : sucesso);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="surface-card grid gap-4 p-5 sm:grid-cols-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void enviar("", "PATCH", { nome, email }, "Dados atualizados.");
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usuario-nome">Nome</Label>
          <Input id="usuario-nome" value={nome} onChange={(event) => setNome(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usuario-email">E-mail</Label>
          <Input id="usuario-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={enviando} className="sm:col-span-2 sm:w-fit">
          Salvar dados
        </Button>
      </form>

      <form
        className="surface-card flex flex-col gap-4 p-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void enviar("/perfis", "PUT", { perfis }, "Perfis atualizados. Valem a partir da próxima requisição do usuário.");
        }}
      >
        <PerfisCampo catalogo={catalogo} cursos={cursos} concedentes={concedentes} value={perfis} onChange={setPerfis} />
        <Button type="submit" variant="outline" disabled={enviando} className="sm:w-fit">
          Salvar perfis
        </Button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={enviando}
          onClick={() =>
            void enviar(
              "/senha-provisoria",
              "POST",
              undefined,
              (data) => `Nova senha provisória (válida por 72 horas, não será exibida de novo): ${data.senha_provisoria}`,
            )
          }
        >
          Emitir senha provisória
        </Button>
        {usuario.situacao === "ATIVO" ? (
          <Button
            variant="destructive"
            disabled={enviando}
            onClick={() => void enviar("/inativacao", "POST", undefined, "Usuário inativado e sessões encerradas.")}
          >
            Inativar usuário
          </Button>
        ) : (
          <Button disabled={enviando} onClick={() => void enviar("/reativacao", "POST", undefined, "Usuário reativado.")}>
            Reativar usuário
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm text-status-ok-text">
          {aviso}
        </p>
      )}
    </div>
  );
}
