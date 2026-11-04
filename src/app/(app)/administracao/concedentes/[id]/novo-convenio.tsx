"use client";

import { createConvenioBodySchema } from "@/modules/concedentes/schemas/convenio";
import { ErroCampo, useValidacao } from "@/shared/ui/use-validacao";
import { LIMITE } from "@/lib/campos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { EnvioDocumento } from "@/shared/ui/envio-documento";
import { mensagemDaApi } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

// RF009: number, first period and the signed agreement PDF, uploaded straight to the bucket (D8)
export function NovoConvenio({ concedenteId }: { concedenteId: string }) {
  const router = useRouter();
  const [documento, setDocumento] = useState<{ id: string; nome_original: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { erros, aoInteragir, conferir } = useValidacao(createConvenioBodySchema, (formulario) => {
    const dados = new FormData(formulario);
    return { numero: dados.get("numero"), vigencia_inicio: dados.get("vigencia_inicio"), vigencia_fim: dados.get("vigencia_fim") };
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    const camposOk = conferir(event.currentTarget);
    if (!documento) return setErro("Envie o PDF do convênio assinado.");
    if (!camposOk) return;
    const dados = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/concedentes/${concedenteId}/convenios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: dados.get("numero"),
        vigencia_inicio: dados.get("vigencia_inicio"),
        vigencia_fim: dados.get("vigencia_fim"),
        documento_id: documento.id,
      }),
    });
    if (!response.ok) return setErro(await mensagemDaApi(response, "Não foi possível registrar o convênio."));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} {...aoInteragir} className="grid grid-cols-1 gap-4 sm:grid-cols-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="convenio-numero">Número</Label>
        <Input id="convenio-numero" name="numero" maxLength={LIMITE.numeroConvenio} aria-invalid={Boolean(erros.numero)} aria-describedby="convenio-numero-erro" />
        <ErroCampo id="convenio-numero-erro" mensagem={erros.numero} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="convenio-inicio">Início da vigência</Label>
        <Input id="convenio-inicio" name="vigencia_inicio" type="date" aria-invalid={Boolean(erros.vigencia_inicio)} aria-describedby="convenio-inicio-erro" />
        <ErroCampo id="convenio-inicio-erro" mensagem={erros.vigencia_inicio} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="convenio-fim">Fim da vigência</Label>
        <Input id="convenio-fim" name="vigencia_fim" type="date" aria-invalid={Boolean(erros.vigencia_fim)} aria-describedby="convenio-fim-erro" />
        <ErroCampo id="convenio-fim-erro" mensagem={erros.vigencia_fim} />
      </div>
      <div className="sm:col-span-3">
        <EnvioDocumento tipo="CONVENIO" escopo={{ concedente_id: concedenteId }} rotulo="Convênio assinado (PDF, JPEG ou PNG, até 10 MiB)" aoConcluir={setDocumento} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-3">
          {erro}
        </p>
      )}
      <Button type="submit" className="sm:col-span-3 sm:w-fit">
        Registrar convênio
      </Button>
    </form>
  );
}
