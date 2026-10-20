"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

// Generic form that sends JSON to an /api/v1 route and shows the API error envelope. The
// API validates everything again; this only converts the inputs to the contract types.

export type Campo = {
  nome: string;
  rotulo: string;
  tipo?: "text" | "number" | "date" | "email" | "textarea" | "select" | "checkbox";
  opcoes?: { valor: string; rotulo: string }[];
  valorInicial?: string | number | boolean | null;
  obrigatorio?: boolean;
  /** Empty input is sent as null instead of being left out (clears an optional field). */
  vazioComoNulo?: boolean;
  passo?: string;
};

export const selectClass =
  "h-11 w-full rounded-md border border-navy-900/20 bg-white px-3 text-sm text-navy-900 outline-none transition-colors focus:border-azul-500 focus:ring-2 focus:ring-azul-500/25";

export async function mensagemDaApi(response: Response, padrao: string): Promise<string> {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  if (!error) return padrao;
  const detalhes = Array.isArray(error.details)
    ? error.details.map((detail: { issue?: string; field?: string }) => [detail.field, detail.issue].filter(Boolean).join(": "))
    : [];
  return [error.message, ...detalhes].filter(Boolean).join(" · ");
}

export function FormularioApi({
  campos,
  url,
  metodo = "POST",
  rotuloEnviar,
  sucesso,
  extras,
  redirecionarPara,
  envolverEmLista,
  testId,
}: {
  campos: Campo[];
  url: string;
  metodo?: "POST" | "PUT" | "PATCH";
  rotuloEnviar: string;
  sucesso?: string;
  /** Fixed fields merged into the body (ids chosen elsewhere on the page). */
  extras?: Record<string, unknown>;
  /** Page to open after success; ":id" is replaced by the id of the returned resource. */
  redirecionarPara?: string;
  /** Sends { [chave]: [fields] } instead of the fields (e.g. PUT /cursos/{id}/exigencias). */
  envolverEmLista?: string;
  testId?: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    const formulario = new FormData(event.currentTarget);
    const corpo: Record<string, unknown> = { ...extras };
    for (const campo of campos) {
      if (campo.tipo === "checkbox") {
        corpo[campo.nome] = formulario.get(campo.nome) === "on";
        continue;
      }
      const bruto = String(formulario.get(campo.nome) ?? "").trim();
      if (bruto === "") {
        if (campo.vazioComoNulo) corpo[campo.nome] = null;
        continue;
      }
      corpo[campo.nome] = campo.tipo === "number" ? Number(bruto.replace(",", ".")) : bruto;
    }

    setEnviando(true);
    try {
      const enviado = envolverEmLista ? { [envolverEmLista]: [corpo] } : corpo;
      const response = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(enviado) });
      if (!response.ok) {
        setErro(await mensagemDaApi(response, "Não foi possível salvar."));
        return;
      }
      const { data } = await response.json();
      setAviso(sucesso ?? "Salvo.");
      if (redirecionarPara) router.push(redirecionarPara.replace(":id", String(data?.id ?? "")));
      else router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-5 sm:grid-cols-2" noValidate data-testid={testId}>
      {campos.map((campo) => {
        const id = `campo-${campo.nome}`;
        const inicial = campo.valorInicial ?? "";
        return (
          <div key={campo.nome} className={`flex flex-col gap-1.5 ${campo.tipo === "textarea" ? "sm:col-span-2" : ""}`}>
            {campo.tipo === "checkbox" ? (
              <label htmlFor={id} className="flex items-center gap-2 text-sm text-navy-900">
                <input id={id} name={campo.nome} type="checkbox" defaultChecked={Boolean(campo.valorInicial)} />
                {campo.rotulo}
              </label>
            ) : (
              <>
                <Label htmlFor={id}>{campo.rotulo}</Label>
                {campo.tipo === "select" ? (
                  <select id={id} name={campo.nome} defaultValue={String(inicial)} className={selectClass}>
                    {!campo.obrigatorio && <option value="">—</option>}
                    {campo.opcoes?.map((opcao) => (
                      <option key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </option>
                    ))}
                  </select>
                ) : campo.tipo === "textarea" ? (
                  <textarea
                    id={id}
                    name={campo.nome}
                    defaultValue={String(inicial)}
                    rows={4}
                    className="w-full rounded-md border border-navy-900/20 bg-white p-3 text-sm text-navy-900"
                  />
                ) : (
                  <Input id={id} name={campo.nome} type={campo.tipo ?? "text"} step={campo.passo} defaultValue={String(inicial)} />
                )}
              </>
            )}
          </div>
        );
      })}
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm text-status-ok-text sm:col-span-2">
          {aviso}
        </p>
      )}
      <Button type="submit" disabled={enviando} className="sm:col-span-2 sm:w-fit">
        {enviando ? "Salvando..." : rotuloEnviar}
      </Button>
    </form>
  );
}
