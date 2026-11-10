"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { mensagemDaApi } from "./formulario-api";

// PDF ou CSV gerado por uma rota /api/v1. Um link direto mostraria o JSON de erro da API na tela
// quando a sessão expira ou o documento não existe; aqui o erro vira mensagem e a tela fica.
export function BaixarArquivo({ url, rotulo, tamanho = "default" }: { url: string; rotulo: string; tamanho?: "default" | "sm" }) {
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setErro(null);
    setBaixando(true);
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) return setErro(await mensagemDaApi(resposta, "Não foi possível gerar o arquivo."));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await resposta.blob());
      link.download = /filename="([^"]+)"/.exec(resposta.headers.get("Content-Disposition") ?? "")?.[1] ?? "documento";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setErro("Não foi possível baixar o arquivo. Verifique a conexão e tente de novo.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant="outline" size={tamanho} carregando={baixando} onClick={() => void baixar()}>
        {!baixando && <FileDown className="size-4" aria-hidden />}
        {rotulo}
      </Button>
      {erro && (
        <span role="alert" className="max-w-md text-xs text-status-danger-text">
          {erro}
        </span>
      )}
    </span>
  );
}
