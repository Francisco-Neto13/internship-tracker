"use client";

import { afastamentoBodySchema } from "@/modules/estagios/schemas/estagio";
import { ErroCampo, useValidacao } from "@/shared/ui/use-validacao";
import { LIMITE } from "@/lib/campos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Confirmacao } from "@/shared/ui/confirmacao";
import { EnvioDocumento } from "@/shared/ui/envio-documento";
import { mensagemDaApi, selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

// RF059, RF060: the coordination registers a leave with its certificate (sensitive, RN-38),
// uploaded straight to the bucket (D8). The planned end moves by the same calendar days.
export function NovoAfastamento({ estagioId }: { estagioId: string }) {
  const router = useRouter();
  const [documento, setDocumento] = useState<{ id: string; nome_original: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Record<string, unknown> | null>(null);
  const [enviando, setEnviando] = useState(false);

  const { erros, aoInteragir, conferir } = useValidacao(afastamentoBodySchema, (formulario) => {
    const dados = new FormData(formulario);
    return {
      tipo: dados.get("tipo"),
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      data_inicio: dados.get("data_inicio"),
      data_fim: dados.get("data_fim"),
    };
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    const camposOk = conferir(event.currentTarget);
    if (!documento) return setErro("Envie o atestado ou comprovante do afastamento.");
    if (!camposOk) return;
    const dados = new FormData(event.currentTarget);
    setPendente({
      tipo: dados.get("tipo"),
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      data_inicio: dados.get("data_inicio"),
      data_fim: dados.get("data_fim"),
      documento_id: documento.id,
    });
  }

  async function enviar() {
    setEnviando(true);
    const response = await fetch(`/api/v1/estagios/${estagioId}/afastamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendente),
    });
    setEnviando(false);
    setPendente(null);
    if (!response.ok) return setErro(await mensagemDaApi(response, "Não foi possível registrar o afastamento."));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} {...aoInteragir} className="surface-card grid gap-4 p-5 sm:grid-cols-3" noValidate data-testid="novo-afastamento">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="afastamento-tipo">Tipo</Label>
        <select id="afastamento-tipo" name="tipo" className={selectClass} defaultValue="ATESTADO_MEDICO">
          <option value="ATESTADO_MEDICO">Atestado médico</option>
          <option value="LICENCA">Licença</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="afastamento-inicio">Início</Label>
        <Input id="afastamento-inicio" name="data_inicio" type="date" aria-invalid={Boolean(erros.data_inicio)} aria-describedby="afastamento-inicio-erro" />
        <ErroCampo id="afastamento-inicio-erro" mensagem={erros.data_inicio} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="afastamento-fim">Fim</Label>
        <Input id="afastamento-fim" name="data_fim" type="date" aria-invalid={Boolean(erros.data_fim)} aria-describedby="afastamento-fim-erro" />
        <ErroCampo id="afastamento-fim-erro" mensagem={erros.data_fim} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-3">
        <Label htmlFor="afastamento-descricao">Descrição (obrigatória no tipo Outro; dado sensível)</Label>
        <Input id="afastamento-descricao" name="descricao" maxLength={LIMITE.descricaoAfastamento} aria-invalid={Boolean(erros.descricao)} aria-describedby="afastamento-descricao-erro" />
        <ErroCampo id="afastamento-descricao-erro" mensagem={erros.descricao} />
      </div>
      <div className="sm:col-span-3">
        <EnvioDocumento tipo="ATESTADO_AFASTAMENTO" escopo={{ estagio_id: estagioId }} rotulo="Atestado (PDF, JPEG ou PNG, até 10 MiB)" aoConcluir={setDocumento} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-3">
          {erro}
        </p>
      )}
      <Button type="submit" className="sm:col-span-3 sm:w-fit">
        Registrar afastamento
      </Button>
      <Confirmacao
        aberto={pendente !== null}
        aoMudarAberto={(aberto) => !aberto && setPendente(null)}
        titulo="Registrar o afastamento?"
        descricao="O término do estágio é estendido pelo mesmo número de dias, até o teto de 2 anos. O registro não se edita: para corrigir, é preciso registrar outro que o substitua."
        rotuloConfirmar="Registrar afastamento"
        ocupado={enviando}
        aoConfirmar={enviar}
      />
    </form>
  );
}
