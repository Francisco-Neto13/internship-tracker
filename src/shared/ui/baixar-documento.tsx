"use client";

import { useState } from "react";
import { Button } from "./button";
import { mensagemDaApi } from "./formulario-api";

// RNF-06, RF072: asks /documentos/{id} for its one-minute signed URL and opens it. The API
// decides whether the caller may read it and records the read of a sensitive document.
export function BaixarDocumento({ documentoId, rotulo = "Baixar" }: { documentoId: string; rotulo?: string }) {
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setErro(null);
    const response = await fetch(`/api/v1/documentos/${documentoId}`);
    if (!response.ok) return setErro(await mensagemDaApi(response, "Não foi possível baixar o documento."));
    const url = (await response.json())?.data?.url_download;
    if (!url) return setErro("O seu perfil não pode baixar este documento.");
    window.location.assign(url);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={baixar}>
        {rotulo}
      </Button>
      {erro && (
        <span role="alert" className="text-sm text-status-danger-text">
          {erro}
        </span>
      )}
    </span>
  );
}
