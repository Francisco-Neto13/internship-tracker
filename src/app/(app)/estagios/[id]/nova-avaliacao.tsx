"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { LIMITE } from "@/lib/campos";
import { AreaTexto } from "@/shared/ui/area-texto";
import { Button } from "@/shared/ui/button";
import { Confirmacao } from "@/shared/ui/confirmacao";
import { mensagemDaApi, selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ErroCampo, useValidacao } from "@/shared/ui/use-validacao";

// RF042, RF043: o supervisor ou a concedente dá uma nota a cada critério ativo, na escala dele. Os
// nomes dos campos seguem o caminho do schema (respostas.0.nota), e o erro aparece no critério.

type Criterio = { id: string; descricao: string; escalaMinima: number; escalaMaxima: number };

/** Até 11 notas cabem como botões; escala maior vira campo numérico. */
const MAIOR_ESCALA_EM_BOTOES = 11;

// Field errors go by the last name of the path, and every grade would be "nota": grades are checked below
const regras = z.object({ momento: z.string(), periodo_inicio: z.string().nullable(), periodo_fim: z.string().nullable() }).refine((corpo) => corpo.momento === "FINAL" || (corpo.periodo_inicio && corpo.periodo_fim && corpo.periodo_fim >= corpo.periodo_inicio), {
  path: ["periodo_fim"],
  message: "Informe o período avaliado, com o fim igual ou depois do início",
});

export function NovaAvaliacao({ estagioId, criterios, jaTemFinal }: { estagioId: string; criterios: Criterio[]; jaTemFinal: boolean }) {
  const router = useRouter();
  const [momento, setMomento] = useState(jaTemFinal ? "PERIODICA" : "FINAL");
  const [erro, setErro] = useState<string | null>(null);
  const [semNota, setSemNota] = useState<number[]>([]);
  const [pendente, setPendente] = useState<Record<string, unknown> | null>(null);
  const [enviando, setEnviando] = useState(false);

  function montar(formulario: HTMLFormElement) {
    const dados = new FormData(formulario);
    const texto = (nome: string) => String(dados.get(nome) ?? "").trim() || null;
    return {
      momento: dados.get("momento"),
      periodo_inicio: texto("periodo_inicio"),
      periodo_fim: texto("periodo_fim"),
      observacoes: texto("observacoes"),
      respostas: criterios.map((criterio, indice) => {
        const nota = texto(`respostas.${indice}.nota`);
        return { criterio_id: criterio.id, nota: nota === null ? undefined : Number(nota), comentario: texto(`respostas.${indice}.comentario`) };
      }),
    };
  }

  const { erros, aoInteragir, conferir } = useValidacao(regras, montar);

  function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const formulario = evento.currentTarget;
    const periodoCerto = conferir(formulario);
    const corpo = montar(formulario);
    const invalidas = corpo.respostas.flatMap((resposta, indice) => {
      const { escalaMinima, escalaMaxima } = criterios[indice];
      return Number.isInteger(resposta.nota) && resposta.nota! >= escalaMinima && resposta.nota! <= escalaMaxima ? [] : [indice];
    });
    setSemNota(invalidas);
    if (invalidas.length > 0) return formulario.querySelector<HTMLElement>(`[name="respostas.${invalidas[0]}.nota"]`)?.focus();
    if (periodoCerto) setPendente(corpo);
  }

  async function enviar() {
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/v1/estagios/${estagioId}/avaliacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendente) });
      if (!resposta.ok) return setErro(await mensagemDaApi(resposta, "Não foi possível registrar a avaliação."));
      router.refresh();
    } finally {
      setEnviando(false);
      setPendente(null);
    }
  }

  return (
    <form onSubmit={onSubmit} {...aoInteragir} className="flex flex-col gap-5" noValidate data-testid="nova-avaliacao">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="avaliacao-momento">Momento</Label>
        <select id="avaliacao-momento" name="momento" className={selectClass} value={momento} onChange={(evento) => setMomento(evento.target.value)}>
          {!jaTemFinal && <option value="FINAL">Avaliação final</option>}
          <option value="PERIODICA">Avaliação periódica</option>
        </select>
      </div>
      {momento === "PERIODICA" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="avaliacao-inicio">Início do período</Label>
            <Input id="avaliacao-inicio" name="periodo_inicio" type="date" aria-invalid={Boolean(erros.periodo_inicio)} aria-describedby="avaliacao-inicio-erro" />
            <ErroCampo id="avaliacao-inicio-erro" mensagem={erros.periodo_inicio} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="avaliacao-fim">Fim do período</Label>
            <Input id="avaliacao-fim" name="periodo_fim" type="date" aria-invalid={Boolean(erros.periodo_fim)} aria-describedby="avaliacao-fim-erro" />
            <ErroCampo id="avaliacao-fim-erro" mensagem={erros.periodo_fim} />
          </div>
        </div>
      )}

      {criterios.map((criterio, indice) => {
        const campo = `respostas.${indice}.nota`;
        const quantidade = criterio.escalaMaxima - criterio.escalaMinima + 1;
        return (
          <fieldset key={criterio.id} className="flex min-w-0 flex-col gap-2 border-t border-navy-900/[0.07] pt-4" onChange={() => setSemNota((lista) => lista.filter((item) => item !== indice))}>
            <legend className="float-left w-full text-sm font-medium text-navy-900">{criterio.descricao}</legend>
            <p className="clear-both text-xs text-navy-900/65">
              De {criterio.escalaMinima} a {criterio.escalaMaxima}
            </p>
            {quantidade <= MAIOR_ESCALA_EM_BOTOES ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: quantidade }, (_, passo) => criterio.escalaMinima + passo).map((nota) => (
                  <label key={nota} className="cursor-pointer">
                    <input type="radio" name={campo} value={nota} className="peer sr-only" aria-label={`Nota ${nota}`} />
                    <span className="flex size-10 items-center justify-center rounded-md border border-navy-900/20 bg-white text-sm text-navy-900 tabular-nums transition-colors duration-[var(--duracao-rapida)] ease-padrao peer-checked:border-navy-700 peer-checked:bg-navy-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-azul-500 peer-focus-visible:ring-offset-2 hover:bg-nevoa-100 peer-checked:hover:bg-navy-700">
                      {nota}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <Input name={campo} type="number" min={criterio.escalaMinima} max={criterio.escalaMaxima} aria-label={`Nota de ${criterio.descricao}`} aria-invalid={semNota.includes(indice)} className="w-32" />
            )}
            <ErroCampo id={`avaliacao-nota-${indice}-erro`} mensagem={semNota.includes(indice) ? `Dê uma nota de ${criterio.escalaMinima} a ${criterio.escalaMaxima} a este critério` : undefined} />
            <Input name={`respostas.${indice}.comentario`} maxLength={LIMITE.comentarioAvaliacao} placeholder="Comentário (opcional)" aria-label={`Comentário sobre ${criterio.descricao}`} />
          </fieldset>
        );
      })}

      <div className="flex flex-col gap-1.5 border-t border-navy-900/[0.07] pt-4">
        <Label htmlFor="avaliacao-observacoes">Observações gerais (opcional)</Label>
        <AreaTexto id="avaliacao-observacoes" name="observacoes" rows={3} maxLength={LIMITE.observacoesAvaliacao} />
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <Button type="submit" className="sm:w-fit">
        Registrar avaliação
      </Button>
      <Confirmacao
        aberto={pendente !== null}
        aoMudarAberto={(aberto) => !aberto && setPendente(null)}
        titulo="Registrar a avaliação?"
        descricao={momento === "FINAL" ? "A avaliação não se edita depois de registrada. Só existe uma avaliação final, e ela é exigida para a conclusão do estágio." : "A avaliação não se edita depois de registrada."}
        rotuloConfirmar="Registrar avaliação"
        ocupado={enviando}
        aoConfirmar={enviar}
      />
    </form>
  );
}
