"use client";

import { useState } from "react";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { BuscaConta, type Conta } from "@/shared/ui/busca-conta";
import { selectClass } from "@/shared/ui/formulario-api";
import { Label } from "@/shared/ui/label";

// RF031: a coordenação escolhe o responsável pelo nome. Orientador: quem tem o perfil vigente;
// supervisor: quem pertence à concedente deste estágio.
const AJUDA = { ORIENTADOR: "Contas com perfil de professor orientador.", SUPERVISOR: "Contas com perfil de supervisor nesta concedente." };

export function VincularResponsavel({ estagioId }: { estagioId: string }) {
  const [papel, setPapel] = useState<keyof typeof AJUDA>("ORIENTADOR");
  const [conta, setConta] = useState<Conta | null>(null);
  const api = `/api/v1/estagios/${estagioId}/responsaveis`;

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="vincular-responsavel">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="responsavel-papel">Papel</Label>
        <select
          id="responsavel-papel"
          className={selectClass}
          value={papel}
          onChange={(evento) => {
            setPapel(evento.target.value as keyof typeof AJUDA);
            setConta(null);
          }}
        >
          <option value="ORIENTADOR">Professor orientador</option>
          <option value="SUPERVISOR">Supervisor</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="responsavel-conta">Pessoa</Label>
        <BuscaConta
          key={papel}
          id="responsavel-conta"
          endereco={(busca) => `${api}/contas?papel=${papel}&busca=${encodeURIComponent(busca)}`}
          vazio="Nenhuma conta compatível com este papel foi encontrada."
          onEscolher={setConta}
        />
        <p className="text-xs text-navy-900/65">{AJUDA[papel]}</p>
      </div>
      {conta && (
        <div className="sm:col-span-2">
          <BotaoAcao
            url={api}
            rotulo="Vincular responsável"
            corpo={{ papel, usuario_id: conta.id }}
            variante="default"
            confirmacao={{ titulo: "Vincular este responsável?", descricao: `${conta.nome} passa a ter acesso ao estágio. Se já houver um responsável nessa função, a substituição fica registrada e não apaga o anterior.`, confirmar: "Vincular" }}
          />
        </div>
      )}
    </div>
  );
}
