"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { EnvioDocumento } from "@/shared/ui/envio-documento";
import { mensagemDaApi, selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

// RF049, RF050: the student registers the activity with its proof, uploaded straight to the
// bucket (D8); the API decides the rest (category of the course, duplicates, dates)
export function NovaAtividade({ estudanteId, categorias }: { estudanteId: string; categorias: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [documento, setDocumento] = useState<{ id: string; nome_original: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    if (!documento) return setErro("Envie o comprovante (certificado ou declaração).");
    const dados = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/atividades-complementares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria_id: dados.get("categoria_id"),
        descricao: dados.get("descricao"),
        instituicao_promotora: dados.get("instituicao_promotora"),
        data_inicio: dados.get("data_inicio"),
        data_fim: dados.get("data_fim"),
        horas_declaradas: Number(dados.get("horas_declaradas")),
        documento_ids: [documento.id],
      }),
    });
    if (!response.ok) return setErro(await mensagemDaApi(response, "Não foi possível cadastrar a atividade."));
    setDocumento(null);
    event.currentTarget?.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate data-testid="nova-atividade">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="atividade-categoria">Categoria</Label>
        <select id="atividade-categoria" name="categoria_id" className={selectClass} required>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="atividade-horas">Carga horária (h)</Label>
        <Input id="atividade-horas" name="horas_declaradas" type="number" step="0.25" min="0.25" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="atividade-descricao">Descrição</Label>
        <Input id="atividade-descricao" name="descricao" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="atividade-instituicao">Instituição promotora</Label>
        <Input id="atividade-instituicao" name="instituicao_promotora" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="atividade-inicio">Início</Label>
        <Input id="atividade-inicio" name="data_inicio" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="atividade-fim">Fim</Label>
        <Input id="atividade-fim" name="data_fim" type="date" />
      </div>
      <div className="sm:col-span-2">
        <EnvioDocumento
          tipo="COMPROVANTE_ATIVIDADE"
          escopo={{ estudante_id: estudanteId }}
          rotulo="Comprovante (PDF, JPEG ou PNG, até 10 MiB)"
          aoConcluir={setDocumento}
        />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
          {erro}
        </p>
      )}
      <Button type="submit" className="sm:col-span-2 sm:w-fit">
        Enviar para análise
      </Button>
    </form>
  );
}
