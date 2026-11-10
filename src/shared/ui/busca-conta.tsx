"use client";

import { LIMITE } from "@/lib/campos";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { Input } from "./input";

export type Conta = { id: string; nome: string; email: string };

/**
 * Procura uma conta pelo nome ou e-mail, para ninguém precisar saber um código interno. Quem pode
 * buscar e quais contas voltam é decidido pela função do banco por trás de `endereco`.
 */
export function BuscaConta({ id, endereco, vazio, onEscolher }: { id: string; endereco: (busca: string) => string; vazio: string; onEscolher: (conta: Conta | null) => void }) {
  const [busca, setBusca] = useState("");
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [escolhida, setEscolhida] = useState<Conta | null>(null);

  useEffect(() => {
    if (busca.trim().length < 2) return;
    const controle = new AbortController();
    const espera = setTimeout(async () => {
      const resposta = await fetch(endereco(busca.trim()), { signal: controle.signal }).catch(() => null);
      if (!resposta?.ok) return setContas([]);
      setContas(((await resposta.json()).data as Conta[]) ?? []);
    }, 300);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
    // `endereco` is a new function on every render of the parent; the search text decides
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  if (escolhida) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-azul-500/40 bg-azul-500/5 px-3 py-2">
        <Avatar nome={escolhida.nome} semente={escolhida.id} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{escolhida.nome}</p>
          <p className="truncate text-xs text-navy-900/65">{escolhida.email}</p>
        </div>
        <button type="button" onClick={() => (setEscolhida(null), onEscolher(null))} className="text-sm text-azul-500 hover:text-navy-700">
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-900/40" aria-hidden />
        <Input id={id} maxLength={LIMITE.busca} value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome ou e-mail da conta" className="pl-9" autoComplete="off" />
      </div>
      {busca.trim().length >= 2 && contas && (
        <ul className="max-h-56 overflow-y-auto rounded-lg border border-navy-900/10" role="listbox" aria-label="Contas encontradas">
          {contas.length === 0 && <li className="px-3 py-3 text-sm text-navy-900/65">{vazio}</li>}
          {contas.map((conta) => (
            <li key={conta.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  setEscolhida(conta);
                  onEscolher(conta);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa-50 focus-visible:bg-nevoa-50 focus-visible:outline-none"
              >
                <Avatar nome={conta.nome} semente={conta.id} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-navy-900">{conta.nome}</span>
                  <span className="block truncate text-xs text-navy-900/65">{conta.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
