"use client";

import { Eye, Search, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LIMITE } from "@/lib/campos";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { Dialogo, useFecharDialogo } from "@/shared/ui/dialogo";
import { Input } from "@/shared/ui/input";

// RF003: the administrator uses the system as another account, to check what each profile
// reaches and to run its steps without signing in again. The server reads the switch on every
// request and records the administrator with every write; this component only opens and closes it. The router cache is refreshed after each change,
// so no screen keeps data read under the previous identity.

type Conta = { id: string; nome: string; email: string; perfis: string[] };

async function mensagemDeErro(resposta: Response) {
  const corpo = await resposta.json().catch(() => null);
  return (corpo?.error?.message as string | undefined) ?? "Não foi possível trocar de perfil. Tente de novo.";
}

/** The other identity starts at its own dashboard, with nothing cached from the previous one. */
function recomecar(router: ReturnType<typeof useRouter>) {
  router.replace("/dashboard");
  router.refresh();
}

function EscolhaDeConta({ rotulos }: { rotulos: Record<string, string> }) {
  const [perfil, setPerfil] = useState("");
  const [busca, setBusca] = useState("");
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [entrando, setEntrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const fechar = useFecharDialogo();

  useEffect(() => {
    const controle = new AbortController();
    const espera = setTimeout(async () => {
      const parametros = new URLSearchParams();
      if (perfil) parametros.set("perfil", perfil);
      if (busca.trim()) parametros.set("busca", busca.trim());
      const resposta = await fetch(`/api/v1/contexto/contas?${parametros}`, { signal: controle.signal }).catch(() => null);
      if (!resposta) return;
      if (!resposta.ok) {
        setErro(await mensagemDeErro(resposta));
        return setContas([]);
      }
      setErro(null);
      setContas(((await resposta.json()).data as Conta[]) ?? []);
    }, 250);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [perfil, busca]);

  async function verComo(conta: Conta) {
    setEntrando(conta.id);
    setErro(null);
    const resposta = await fetch("/api/v1/contexto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: conta.id }),
    }).catch(() => null);
    if (resposta?.ok) {
      fechar();
      return recomecar(router);
    }
    setEntrando(null);
    setErro(resposta ? await mensagemDeErro(resposta) : "Sem conexão com o servidor.");
  }

  const filtros = [["", "Todos"], ...Object.entries(rotulos)];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filtrar por perfil" className="flex flex-wrap gap-1.5">
        {filtros.map(([valor, rotulo]) => (
          <button
            key={valor || "todos"}
            type="button"
            aria-pressed={perfil === valor}
            onClick={() => setPerfil(valor)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
              perfil === valor ? "border-navy-700 bg-navy-700 text-white" : "border-navy-900/15 text-navy-900/75 hover:bg-nevoa-100",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-900/40" aria-hidden />
        <Input
          aria-label="Buscar conta por nome ou e-mail"
          maxLength={LIMITE.busca}
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Nome ou e-mail"
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {erro && (
        <p role="alert" className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <ul aria-label="Contas" className="max-h-80 divide-y divide-navy-900/[0.07] overflow-y-auto rounded-lg border border-navy-900/10">
        {contas === null && <li className="px-3 py-3 text-sm text-navy-900/65">Carregando…</li>}
        {contas?.length === 0 && <li className="px-3 py-3 text-sm text-navy-900/65">Nenhuma conta encontrada.</li>}
        {contas?.map((conta) => (
          <li key={conta.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar nome={conta.nome} semente={conta.id} tamanho="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-900">{conta.nome}</p>
              <p className="truncate text-xs text-navy-900/65">{conta.email}</p>
              <p className="mt-1 flex flex-wrap gap-1">
                {conta.perfis.length === 0 && <span className="text-xs text-navy-900/65">Sem perfil vigente</span>}
                {conta.perfis.map((codigo) => (
                  <span key={codigo} className="rounded-full bg-nevoa-100 px-2 py-0.5 text-[11px] font-medium text-navy-700">
                    {rotulos[codigo] ?? codigo}
                  </span>
                ))}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              carregando={entrando === conta.id}
              disabled={entrando !== null}
              onClick={() => verComo(conta)}
              aria-label={`Ver o sistema como ${conta.nome}`}
            >
              Ver como
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Opens the switch: in the top bar for an administrator, in the banner during a switch. */
export function TrocaDePerfil({ rotulos, rotulo = "Ver como" }: { rotulos: Record<string, string>; rotulo?: string }) {
  return (
    <Dialogo
      gatilho={{ rotulo, icone: <Eye className="size-4" aria-hidden />, variante: "outline" }}
      titulo="Ver o sistema como outra conta"
      descricao="Você usa o sistema como essa pessoa: vê as mesmas telas e pode agir por ela, como assinar um contrato. Cada ação fica na auditoria em nome dela e como feita por você. Relatórios e documentos continuam fechados."
      largura="lg"
    >
      <EscolhaDeConta rotulos={rotulos} />
    </Dialogo>
  );
}

/** Shown on every screen while the administrator acts as another account. */
export function FaixaContexto({ nome, perfis, nomeTitular, rotulos }: { nome: string; perfis: string[]; nomeTitular: string; rotulos: Record<string, string> }) {
  const [voltando, setVoltando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function voltar() {
    setVoltando(true);
    const resposta = await fetch("/api/v1/contexto", { method: "DELETE" }).catch(() => null);
    if (resposta?.ok) return recomecar(router);
    setVoltando(false);
    setErro(resposta ? await mensagemDeErro(resposta) : "Sem conexão com o servidor.");
  }

  return (
    <section
      aria-label="Troca de perfil"
      data-testid="faixa-contexto"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-status-pending-text/25 bg-status-pending-bg px-4 py-2.5 text-sm text-status-pending-text md:px-6"
    >
      <Eye className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        Você ({nomeTitular}) está usando o sistema como <strong className="font-semibold">{nome}</strong>
        {perfis.length > 0 && <> · {perfis.join(", ")}</>}. O que você fizer fica no nome dessa conta e registrado como feito por você.
        {erro && <span role="alert" className="ml-2 font-medium text-status-danger-text">{erro}</span>}
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <TrocaDePerfil rotulos={rotulos} rotulo="Outra conta" />
        <Button onClick={voltar} carregando={voltando}>
          <Undo2 className="size-4" aria-hidden />
          Voltar ao meu perfil
        </Button>
      </div>
    </section>
  );
}
