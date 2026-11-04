"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { useFecharDialogo } from "@/shared/ui/dialogo";
import { mensagemDaApi, selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const estudanteSchema = z.object({
  usuario_id: z.uuid("Escolha a conta do estudante"),
  curso_id: z.uuid("Selecione um curso"),
  matricula: z.string().trim().min(1, "Informe a matrícula"),
  periodo: z.coerce.number({ message: "Informe o período" }).int().min(1, "Entre 1 e 20").max(20, "Entre 1 e 20"),
});

type EstudanteInput = z.input<typeof estudanteSchema>;
type EstudanteOutput = z.output<typeof estudanteSchema>;
type Conta = { id: string; nome: string; email: string };

/**
 * RF005: o perfil acadêmico nasce sobre uma conta que já existe (RF001). O administrador busca a
 * conta pelo nome entre as que têm perfil Estudante; a coordenação não lê contas fora dos seus
 * estudantes (RLS de usuario), então informa o código da conta que o administrador repassou.
 */
function EscolhaDeConta({ onEscolher }: { onEscolher: (conta: Conta | null) => void }) {
  const [busca, setBusca] = useState("");
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [escolhida, setEscolhida] = useState<Conta | null>(null);

  useEffect(() => {
    if (busca.trim().length < 2) return;
    const controle = new AbortController();
    const espera = setTimeout(async () => {
      const resposta = await fetch(`/api/v1/usuarios?perfil=ESTUDANTE&situacao=ATIVO&limit=8&busca=${encodeURIComponent(busca.trim())}`, { signal: controle.signal }).catch(() => null);
      if (!resposta?.ok) return setContas([]);
      setContas(((await resposta.json()).data as Conta[]) ?? []);
    }, 300);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [busca]);

  if (escolhida) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-azul-500/40 bg-azul-500/5 px-3 py-2">
        <Avatar nome={escolhida.nome} semente={escolhida.id} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{escolhida.nome}</p>
          <p className="truncate text-xs text-navy-900/65">{escolhida.email}</p>
        </div>
        <button type="button" onClick={() => (setEscolhida(null), onEscolher(null))} className="text-sm text-azul-500 hover:text-navy-700">
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-900/40" aria-hidden />
        <Input id="estudante-conta" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome ou e-mail da conta" className="pl-9" autoComplete="off" />
      </div>
      {busca.trim().length >= 2 && contas && (
        <ul className="max-h-56 overflow-y-auto rounded-lg border border-navy-900/10" role="listbox" aria-label="Contas encontradas">
          {contas.length === 0 && <li className="px-3 py-3 text-sm text-navy-900/65">Nenhuma conta ativa com perfil Estudante encontrada.</li>}
          {contas.map((conta) => (
            <li key={conta.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  setEscolhida(conta);
                  onEscolher(conta);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-nevoa-50 focus-visible:bg-nevoa-50 focus-visible:outline-none"
              >
                <Avatar nome={conta.nome} semente={conta.id} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-navy-900">{conta.nome}</span>
                  <span className="block truncate text-xs text-navy-900/65">{conta.email}</span>
                </span>
                <Check className="size-4 text-transparent" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EstudanteForm({ cursos, buscarContas }: { cursos: { id: string; nome: string }[]; buscarContas: boolean }) {
  const router = useRouter();
  const fechar = useFecharDialogo();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstudanteInput, unknown, EstudanteOutput>({
    resolver: zodResolver(estudanteSchema),
    defaultValues: { curso_id: cursos.length === 1 ? cursos[0].id : "" },
  });

  async function onSubmit(values: EstudanteOutput) {
    setErro(null);
    const response = await fetch("/api/v1/estudantes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) return setErro(await mensagemDaApi(response, "Não foi possível cadastrar o estudante."));
    const { data } = await response.json();
    fechar();
    router.push(`/administracao/estudantes/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="estudante-conta">Conta do estudante</Label>
        {buscarContas ? (
          <>
            <EscolhaDeConta onEscolher={(conta) => setValue("usuario_id", conta?.id ?? "", { shouldValidate: Boolean(conta) })} />
            <input type="hidden" {...register("usuario_id")} />
          </>
        ) : (
          <>
            <Input id="estudante-conta" placeholder="Código da conta, informado pelo administrador" aria-invalid={Boolean(errors.usuario_id)} {...register("usuario_id")} />
            <p className="text-xs text-navy-900/65">A conta é criada pelo administrador com o perfil Estudante; ele repassa o código.</p>
          </>
        )}
        {errors.usuario_id && <p className="text-sm text-status-danger-text">{errors.usuario_id.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="estudante-curso">Curso</Label>
        <select id="estudante-curso" className={selectClass} aria-invalid={Boolean(errors.curso_id)} {...register("curso_id")}>
          <option value="">Selecione</option>
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {curso.nome}
            </option>
          ))}
        </select>
        {errors.curso_id && <p className="text-sm text-status-danger-text">{errors.curso_id.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estudante-matricula">Matrícula</Label>
        <Input id="estudante-matricula" aria-invalid={Boolean(errors.matricula)} {...register("matricula")} />
        {errors.matricula && <p className="text-sm text-status-danger-text">{errors.matricula.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estudante-periodo">Período</Label>
        <Input id="estudante-periodo" type="number" min={1} max={20} aria-invalid={Boolean(errors.periodo)} {...register("periodo")} />
        {errors.periodo && <p className="text-sm text-status-danger-text">{errors.periodo.message}</p>}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando…" : "Cadastrar estudante"}
        </Button>
      </div>
    </form>
  );
}
