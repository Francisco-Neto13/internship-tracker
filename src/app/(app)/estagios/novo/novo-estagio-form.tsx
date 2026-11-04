"use client";

import { createEstagioBodySchema } from "@/modules/estagios/schemas/estagio";
import { ErroCampo, useValidacao } from "@/shared/ui/use-validacao";
import { AreaTexto } from "@/shared/ui/area-texto";
import { LIMITE } from "@/lib/campos";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { mensagemDaApi, selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

// RF015, RF044: o TCE em edição, em quatro partes (quem, quando e quanto, contrapartidas,
// condições). Escolher o convênio já define a concedente, que antes era um segundo campo que
// podia contradizer o primeiro. A API valida tudo de novo (lei, parâmetros, convênio vigente).

type Opcao = { id: string; rotulo: string };
type Convenio = { id: string; concedenteId: string; rotulo: string };

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-navy-900/[0.07] pt-5 first:border-0 first:pt-0 md:grid-cols-[220px_1fr]">
      <legend className="contents">
        <span className="block">
          <span className="block text-sm font-semibold text-navy-900">{titulo}</span>
          <span className="mt-0.5 block text-sm text-navy-900/65">{descricao}</span>
        </span>
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({ id, rotulo, ajuda, largo, children }: { id: string; rotulo: string; ajuda?: string; largo?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${largo ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {ajuda && <p className="text-xs text-navy-900/65">{ajuda}</p>}
    </div>
  );
}

export function NovoEstagioForm({ estudantes, convenios }: { estudantes: Opcao[]; convenios: Convenio[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("OBRIGATORIO");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function montarCorpo(formulario: HTMLFormElement) {
    const dados = new FormData(formulario);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim();
    const numero = (chave: string) => (texto(chave) === "" ? undefined : Number(texto(chave).replace(",", ".")));
    const convenio = convenios.find((item) => item.id === texto("convenio_id"));
    const corpo = {
      estudante_id: texto("estudante_id"),
      convenio_id: convenio?.id,
      concedente_id: convenio?.concedenteId,
      tipo,
      data_inicio: texto("data_inicio"),
      data_fim_pactuada: texto("data_fim_pactuada"),
      carga_horas_diaria: numero("carga_horas_diaria"),
      carga_horas_semanal: numero("carga_horas_semanal"),
      carga_horas_total: numero("carga_horas_total"),
      bolsa_valor: numero("bolsa_valor") ?? null,
      auxilio_transporte_valor: numero("auxilio_transporte_valor") ?? null,
      seguro_exigido: dados.get("seguro_exigido") === "on",
      condicoes_pactuadas: texto("condicoes_pactuadas"),
    };
    return corpo;
  }

  const { erros, aoInteragir, conferir } = useValidacao(createEstagioBodySchema, montarCorpo);

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (!conferir(evento.currentTarget)) return;
    const corpo = montarCorpo(evento.currentTarget);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/v1/estagios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      if (!resposta.ok) return setErro(await mensagemDaApi(resposta, "Não foi possível criar o estágio."));
      const { data } = await resposta.json();
      router.push(`/estagios/${data.id}?aba=formalizacao`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} {...aoInteragir} noValidate className="surface-card flex flex-col gap-5 p-5 md:p-6">
      <Secao titulo="Partes" descricao="Estudante matriculado e o convênio vigente com a concedente.">
        <Campo id="novo-estudante" rotulo="Estudante" largo>
          <select id="novo-estudante" name="estudante_id" className={selectClass} defaultValue="" required>
            <option value="" disabled>
              Selecione o estudante
            </option>
            {estudantes.map((estudante) => (
              <option key={estudante.id} value={estudante.id}>
                {estudante.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="novo-convenio" rotulo="Concedente e convênio" ajuda="Só convênios ativos com vigência ainda em curso." largo>
          <select id="novo-convenio" name="convenio_id" className={selectClass} defaultValue="" required>
            <option value="" disabled>
              Selecione o convênio
            </option>
            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="novo-tipo" rotulo="Tipo de estágio" largo>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de estágio">
            {[
              { valor: "OBRIGATORIO", rotulo: "Obrigatório", detalhe: "Conta para a carga mínima do curso" },
              { valor: "NAO_OBRIGATORIO", rotulo: "Não obrigatório", detalhe: "Bolsa e auxílio-transporte compulsórios" },
            ].map((opcao) => (
              <label
                key={opcao.valor}
                className={`flex min-w-56 flex-1 cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul-500 ${tipo === opcao.valor ? "border-navy-700 bg-nevoa-50" : "border-navy-900/15 hover:bg-nevoa-50"}`}
              >
                <input type="radio" name="tipo" value={opcao.valor} checked={tipo === opcao.valor} onChange={() => setTipo(opcao.valor)} className="sr-only" />
                <span className="font-medium text-navy-900">{opcao.rotulo}</span>
                <span className="text-xs text-navy-900/65">{opcao.detalhe}</span>
              </label>
            ))}
          </div>
        </Campo>
      </Secao>

      <Secao titulo="Período e jornada" descricao="Até 6 h por dia e 30 h por semana (Lei 11.788/2008, art. 10), no máximo 2 anos na mesma concedente.">
        <Campo id="novo-inicio" rotulo="Início">
          <Input id="novo-inicio" name="data_inicio" type="date" required aria-invalid={Boolean(erros.data_inicio)} aria-describedby="novo-inicio-erro" />
          <ErroCampo id="novo-inicio-erro" mensagem={erros.data_inicio} />
        </Campo>
        <Campo id="novo-fim" rotulo="Término pactuado">
          <Input id="novo-fim" name="data_fim_pactuada" type="date" required aria-invalid={Boolean(erros.data_fim_pactuada)} aria-describedby="novo-fim-erro" />
          <ErroCampo id="novo-fim-erro" mensagem={erros.data_fim_pactuada} />
        </Campo>
        <Campo id="novo-diaria" rotulo="Jornada diária (h)">
          <Input id="novo-diaria" name="carga_horas_diaria" type="number" step="0.25" min="0" inputMode="decimal" required aria-invalid={Boolean(erros.carga_horas_diaria)} aria-describedby="novo-diaria-erro" />
          <ErroCampo id="novo-diaria-erro" mensagem={erros.carga_horas_diaria} />
        </Campo>
        <Campo id="novo-semanal" rotulo="Jornada semanal (h)">
          <Input id="novo-semanal" name="carga_horas_semanal" type="number" step="0.25" min="0" inputMode="decimal" required aria-invalid={Boolean(erros.carga_horas_semanal)} aria-describedby="novo-semanal-erro" />
          <ErroCampo id="novo-semanal-erro" mensagem={erros.carga_horas_semanal} />
        </Campo>
        <Campo id="novo-total" rotulo="Carga horária total (h)">
          <Input id="novo-total" name="carga_horas_total" type="number" step="0.25" min="0" inputMode="decimal" required aria-invalid={Boolean(erros.carga_horas_total)} aria-describedby="novo-total-erro" />
          <ErroCampo id="novo-total-erro" mensagem={erros.carga_horas_total} />
        </Campo>
      </Secao>

      <Secao
        titulo="Contrapartidas"
        descricao={tipo === "NAO_OBRIGATORIO" ? "No estágio não obrigatório, bolsa e auxílio-transporte são compulsórios (art. 12)." : "Opcionais no estágio obrigatório."}
      >
        <Campo id="novo-bolsa" rotulo="Bolsa (R$)">
          <Input id="novo-bolsa" name="bolsa_valor" type="number" step="0.01" min="0" inputMode="decimal" required={tipo === "NAO_OBRIGATORIO"} />
        </Campo>
        <Campo id="novo-auxilio" rotulo="Auxílio-transporte (R$)">
          <Input id="novo-auxilio" name="auxilio_transporte_valor" type="number" step="0.01" min="0" inputMode="decimal" required={tipo === "NAO_OBRIGATORIO"} />
        </Campo>
        <label className="flex items-start gap-2 text-sm text-navy-900 sm:col-span-2">
          <input type="checkbox" name="seguro_exigido" defaultChecked className="mt-0.5 size-4 accent-navy-700" />
          <span>
            Seguro contra acidentes pessoais exigido
            <span className="block text-xs text-navy-900/65">Lei 11.788/2008, art. 9º, IV: a apólice vigente é guarda de ativação.</span>
          </span>
        </label>
      </Secao>

      <Secao titulo="Condições pactuadas" descricao="O que fica acordado entre as partes; entra no texto do TCE e no hash assinado.">
        <div className="sm:col-span-2">
          <label htmlFor="novo-condicoes" className="sr-only">
            Condições pactuadas
          </label>
          <AreaTexto
            id="novo-condicoes"
            name="condicoes_pactuadas"
            rows={5}
            required
            maxLength={LIMITE.condicoes}
            aria-invalid={Boolean(erros.condicoes_pactuadas)}
            aria-describedby="novo-condicoes-erro"
          />
          <ErroCampo id="novo-condicoes-erro" mensagem={erros.condicoes_pactuadas} />
        </div>
      </Secao>

      {erro && (
        <p role="alert" className="rounded-lg bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-navy-900/[0.07] pt-5">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Criando…" : "Criar estágio em formalização"}
        </Button>
      </div>
    </form>
  );
}
