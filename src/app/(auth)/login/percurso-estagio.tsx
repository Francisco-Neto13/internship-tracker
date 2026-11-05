"use client";

import { CalendarCheck, ClipboardList, FileSignature, FileText, GraduationCap, Star, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/ui/cn";

// O percurso real de um estágio, e quem atua em cada etapa. Cada afirmação aqui corresponde a uma
// regra do sistema (AGENTS.md, DER §4): se a regra mudar, este texto muda junto. É só informação:
// nada aqui decide acesso, e escolher um perfil não muda como se entra.

type Perfil = "ESTUDANTE" | "ORIENTADOR" | "SUPERVISOR" | "COORDENACAO" | "CONCEDENTE" | "ADMINISTRADOR";

const ETAPAS: { nome: string; detalhe: string; icone: LucideIcon; perfis: Perfil[] }[] = [
  { nome: "Termo de compromisso", detalhe: "Assinado pelas três partes", icone: FileSignature, perfis: ["ESTUDANTE", "COORDENACAO", "CONCEDENTE"] },
  { nome: "Plano de atividades", detalhe: "Elaborado e aprovado", icone: ClipboardList, perfis: ["ESTUDANTE", "ORIENTADOR"] },
  { nome: "Frequência", detalhe: "Lançada e homologada", icone: CalendarCheck, perfis: ["ESTUDANTE", "SUPERVISOR"] },
  { nome: "Relatórios", detalhe: "Enviados e analisados", icone: FileText, perfis: ["ESTUDANTE", "ORIENTADOR"] },
  { nome: "Avaliação", detalhe: "Do período e final", icone: Star, perfis: ["SUPERVISOR", "CONCEDENTE"] },
  { nome: "Integralização", detalhe: "Estágio e atividades", icone: GraduationCap, perfis: ["ESTUDANTE", "COORDENACAO"] },
];

const PERFIS: { chave: Perfil; rotulo: string; papel: string }[] = [
  { chave: "ESTUDANTE", rotulo: "Estudante", papel: "Assina o termo, lança a frequência, envia os relatórios e acompanha as próprias horas." },
  { chave: "ORIENTADOR", rotulo: "Orientador", papel: "Aprova o plano de atividades e analisa os relatórios." },
  { chave: "SUPERVISOR", rotulo: "Supervisor", papel: "Homologa a frequência e avalia cada período." },
  { chave: "COORDENACAO", rotulo: "Coordenação", papel: "Assina o termo pela instituição e analisa as atividades complementares." },
  { chave: "CONCEDENTE", rotulo: "Concedente", papel: "Assina o termo pela organização e registra a avaliação final." },
  { chave: "ADMINISTRADOR", rotulo: "Administrador", papel: "Mantém contas e parâmetros e consulta a auditoria, sem ler relatórios nem atestados." },
];

export function PercursoEstagio() {
  const [fixado, setFixado] = useState<Perfil | null>(null);
  const [previa, setPrevia] = useState<Perfil | null>(null);
  const ativo = PERFIS.find((perfil) => perfil.chave === (previa ?? fixado));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:gap-5">
      <div className="flex flex-col gap-4 lg:gap-3">
        <h2 className="text-2xl font-semibold text-balance text-white lg:text-[1.75rem] lg:leading-tight">Do termo de compromisso à integralização, um caminho só.</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ver onde cada perfil atua">
          {PERFIS.map((perfil) => {
            const marcado = fixado === perfil.chave;
            return (
              <button
                key={perfil.chave}
                type="button"
                aria-pressed={marcado}
                onClick={() => setFixado(marcado ? null : perfil.chave)}
                onMouseEnter={() => setPrevia(perfil.chave)}
                onMouseLeave={() => setPrevia(null)}
                onFocus={() => setPrevia(perfil.chave)}
                onBlur={() => setPrevia(null)}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-sm transition-colors duration-[var(--duracao-rapida)] ease-padrao focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 focus-visible:outline-none",
                  perfil.chave === ativo?.chave ? "border-white bg-white font-medium text-navy-900" : "border-white/30 text-white hover:border-white/70",
                )}
              >
                {perfil.rotulo}
              </button>
            );
          })}
        </div>
        {/* Altura reservada: a troca de texto não empurra o percurso */}
        <p aria-live="polite" className="min-h-10 max-w-2xl text-sm text-white/80 md:min-h-5">
          {ativo ? ativo.papel : "Seis perfis sobre a mesma base. Escolha um para ver onde ele atua."}
        </p>
      </div>

      <div className="relative">
        {/* O trilho que liga as etapas: vertical no celular, horizontal a partir do tablet */}
        <span aria-hidden className="absolute top-5 bottom-5 left-5 w-px bg-white/25 md:top-5 md:right-[8.33%] md:bottom-auto md:left-[8.33%] md:h-px md:w-auto md:origin-left md:animate-crescer-x" />
        <ol className="grupo-em-sequencia relative grid grid-cols-1 gap-5 md:grid-cols-6 md:gap-3" data-testid="percurso">
          {ETAPAS.map((etapa) => {
            const Icone = etapa.icone;
            const atua = ativo ? etapa.perfis.includes(ativo.chave) : false;
            return (
              <li key={etapa.nome} data-atua={atua || undefined} className="flex items-center gap-4 md:flex-col md:gap-2.5 md:text-center">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-[var(--duracao-media)] ease-padrao",
                    atua ? "scale-110 border-azul-500 bg-azul-500 text-white" : "border-white/30 bg-navy-900 text-white/80",
                  )}
                >
                  <Icone className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm transition-colors duration-[var(--duracao-media)]", atua ? "font-semibold text-white" : "text-white/90")}>{etapa.nome}</span>
                  <span className="block text-xs text-white/70">{etapa.detalhe}</span>
                  {atua && ativo && <span className="sr-only">Etapa em que {ativo.rotulo} atua.</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
