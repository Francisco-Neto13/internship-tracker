"use client";

import { useState } from "react";
import { Label } from "./label";
import { mensagemDaApi } from "./formulario-api";

// D8 in the browser: hash the file (Web Crypto), ask for a signed URL, PUT the file straight
// to the bucket and confirm. The server checks size, type by content and hash before it
// records the document; the returned id is handed to the parent form.

const ACEITOS = "application/pdf,image/jpeg,image/png";
const LIMITE = 10 * 1024 * 1024;

async function sha256(arquivo: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await arquivo.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function EnvioDocumento({
  tipo,
  escopo,
  rotulo,
  aoConcluir,
}: {
  tipo: string;
  escopo: { concedente_id?: string; estagio_id?: string; estudante_id?: string };
  rotulo: string;
  aoConcluir: (documento: { id: string; nome_original: string }) => void;
}) {
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    setErro(null);
    if (!ACEITOS.split(",").includes(arquivo.type)) return setErro("Envie PDF, JPEG ou PNG.");
    if (arquivo.size > LIMITE) return setErro("O arquivo pode ter no máximo 10 MiB.");
    try {
      setEstado("Calculando o hash...");
      const pedido = await fetch("/api/v1/documentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, tipo_mime: arquivo.type, tamanho_bytes: arquivo.size, sha256: await sha256(arquivo), nome_original: arquivo.name, ...escopo }),
      });
      if (!pedido.ok) return setErro(await mensagemDaApi(pedido, "Envio não autorizado."));
      const { data } = await pedido.json();

      setEstado("Enviando...");
      const envio = await fetch(data.url, { method: "PUT", body: arquivo, headers: { "Content-Type": data.cabecalhos["Content-Type"] } });
      if (!envio.ok) return setErro(`O armazenamento recusou o arquivo (${envio.status}).`);

      setEstado("Conferindo...");
      const confirmacao = await fetch("/api/v1/documentos/upload/confirmacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: data.upload_id }),
      });
      if (!confirmacao.ok) return setErro(await mensagemDaApi(confirmacao, "O arquivo foi recusado na conferência."));
      const { data: documento } = await confirmacao.json();
      setEstado(`Enviado: ${documento.nome_original}`);
      aoConcluir(documento);
    } catch {
      setErro("Falha de rede no envio. Tente de novo.");
    } finally {
      setEstado((atual) => (atual?.startsWith("Enviado") ? atual : null));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`envio-${tipo}`}>{rotulo}</Label>
      <input
        id={`envio-${tipo}`}
        type="file"
        accept={ACEITOS}
        className="text-sm text-navy-900"
        onChange={(event) => {
          const arquivo = event.target.files?.[0];
          if (arquivo) void enviar(arquivo);
        }}
      />
      {estado && <span className="text-xs text-navy-900/60">{estado}</span>}
      {erro && (
        <span role="alert" className="text-xs text-status-danger-text">
          {erro}
        </span>
      )}
    </div>
  );
}
