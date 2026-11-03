"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { mensagemDeErro, PerfisCampo, type OpcaoPerfil, type VinculoEscolhido } from "../perfis-campo";

// RF001-RF003: ações sobre uma conta, cada uma no seu bloco (dados, perfis, segurança). Todas
// chamam a API, que decide; a página recarrega o estado depois. As que cortam acesso pedem
// confirmação dizendo a consequência.

function useEnvio(usuarioId: string) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(caminho: string, method: string, body: unknown, sucesso: string | ((data: { senha_provisoria?: string }) => string)) {
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/v1/usuarios/${usuarioId}${caminho}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        setErro(await mensagemDeErro(response, "Não foi possível concluir a operação."));
        return false;
      }
      const { data } = await response.json();
      setAviso(typeof sucesso === "function" ? sucesso(data) : sucesso);
      router.refresh();
      return true;
    } finally {
      setEnviando(false);
    }
  }

  const retorno = (
    <>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm break-words text-status-ok-text">
          {aviso}
        </p>
      )}
    </>
  );
  return { enviar, enviando, retorno };
}

export function DadosConta({ usuario }: { usuario: { id: string; nome: string; email: string } }) {
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const { enviar, enviando, retorno } = useEnvio(usuario.id);
  const alterado = nome !== usuario.nome || email !== usuario.email;
  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
        <Label htmlFor="usuario-email">E-mail (login)</Label>
        <Input id="usuario-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        {retorno}
        <Button type="submit" variant="outline" disabled={enviando || !alterado} className="w-fit">
          Salvar dados
        </Button>
      </div>
    </form>
  );
}

export function PerfisConta({
  usuarioId,
  perfis: iniciais,
  catalogo,
  cursos,
  concedentes,
}: {
  usuarioId: string;
  perfis: VinculoEscolhido[];
  catalogo: OpcaoPerfil[];
  cursos: { id: string; nome: string }[];
  concedentes: { id: string; nome: string }[];
}) {
  const [perfis, setPerfis] = useState(iniciais);
  const { enviar, enviando, retorno } = useEnvio(usuarioId);
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void enviar("/perfis", "PUT", { perfis }, "Perfis atualizados. Valem a partir da próxima requisição do usuário.");
      }}
    >
      <PerfisCampo catalogo={catalogo} cursos={cursos} concedentes={concedentes} value={perfis} onChange={setPerfis} />
      {retorno}
      <Button type="submit" variant="outline" disabled={enviando} className="w-fit">
        Salvar perfis
      </Button>
    </form>
  );
}

function Confirmar({
  aberto,
  aoMudar,
  titulo,
  descricao,
  confirmar,
  destrutivo,
  aoConfirmar,
  enviando,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  confirmar: string;
  destrutivo?: boolean;
  aoConfirmar: () => void;
  enviando: boolean;
}) {
  // Aberto sem Dialog.Trigger, o Radix não sabe para onde devolver o foco ao fechar
  const origemDoFoco = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            origemDoFoco.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            origemDoFoco.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-navy-900/10 bg-white p-6 shadow-elevated focus:outline-none"
        >
          <Dialog.Title className="text-base font-semibold text-navy-900">{titulo}</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-navy-900/65">{descricao}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button variant={destrutivo ? "destructive" : "default"} disabled={enviando} onClick={aoConfirmar}>
              {enviando ? "Aguarde…" : confirmar}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SegurancaConta({ usuario }: { usuario: { id: string; nome: string; situacao: "ATIVO" | "INATIVO" } }) {
  const { enviar, enviando, retorno } = useEnvio(usuario.id);
  const [confirmando, setConfirmando] = useState<"senha" | "inativar" | null>(null);
  const ativo = usuario.situacao === "ATIVO";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-900">Senha provisória</p>
            <p className="text-sm text-navy-900/60">Para quem esqueceu a senha: vale 72 h, é exibida uma vez e exige troca no primeiro acesso (RF002).</p>
          </div>
        </div>
        <Button variant="outline" disabled={enviando || !ativo} onClick={() => setConfirmando("senha")} className="w-fit">
          Emitir senha provisória
        </Button>
      </div>
      <div className="flex flex-col gap-3 border-t border-navy-900/[0.07] pt-4">
        <div className="flex items-start gap-3">
          {ativo ? <UserX className="mt-0.5 size-5 shrink-0 text-status-danger-text" aria-hidden /> : <UserCheck className="mt-0.5 size-5 shrink-0 text-status-ok-text" aria-hidden />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-900">{ativo ? "Inativar conta" : "Reativar conta"}</p>
            <p className="text-sm text-navy-900/60">
              {ativo ? "Encerra as sessões abertas e impede novos acessos. Os registros da pessoa permanecem." : "Devolve o acesso com os perfis vigentes."}
            </p>
          </div>
        </div>
        {ativo ? (
          <Button variant="destructive" disabled={enviando} onClick={() => setConfirmando("inativar")} className="w-fit">
            Inativar conta
          </Button>
        ) : (
          <Button disabled={enviando} onClick={() => void enviar("/reativacao", "POST", undefined, "Conta reativada.")} className="w-fit">
            Reativar conta
          </Button>
        )}
      </div>
      {retorno}

      <Confirmar
        aberto={confirmando === "senha"}
        aoMudar={(aberto) => !aberto && setConfirmando(null)}
        titulo="Emitir senha provisória?"
        descricao={`A senha atual de ${usuario.nome} deixa de valer. A nova aparece uma única vez nesta tela, para ser entregue fora do sistema.`}
        confirmar="Emitir senha"
        enviando={enviando}
        aoConfirmar={() =>
          void enviar("/senha-provisoria", "POST", undefined, (data) => `Nova senha provisória (72 h, não será exibida de novo): ${data.senha_provisoria}`).then(() => setConfirmando(null))
        }
      />
      <Confirmar
        aberto={confirmando === "inativar"}
        aoMudar={(aberto) => !aberto && setConfirmando(null)}
        titulo={`Inativar a conta de ${usuario.nome}?`}
        descricao="As sessões abertas são encerradas agora e a pessoa não entra mais até ser reativada. Nada é apagado."
        confirmar="Inativar conta"
        destrutivo
        enviando={enviando}
        aoConfirmar={() => void enviar("/inativacao", "POST", undefined, "Conta inativada e sessões encerradas.").then(() => setConfirmando(null))}
      />
    </div>
  );
}
