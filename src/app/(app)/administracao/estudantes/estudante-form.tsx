"use client";

import { LIMITE } from "@/lib/campos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BuscaConta } from "@/shared/ui/busca-conta";
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

// RF005: o perfil acadêmico nasce sobre uma conta que já existe (RF001). Administrador e coordenação
// buscam pelo nome entre as contas ativas com perfil Estudante e ainda sem perfil acadêmico.
export function EstudanteForm({ cursos }: { cursos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const fechar = useFecharDialogo();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstudanteInput, unknown, EstudanteOutput>({
    mode: "onTouched",
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
        <BuscaConta
          id="estudante-conta"
          endereco={(busca) => `/api/v1/usuarios/contas-estudante?busca=${encodeURIComponent(busca)}`}
          vazio="Nenhuma conta ativa com perfil Estudante e sem cadastro acadêmico encontrada."
          onEscolher={(conta) => setValue("usuario_id", conta?.id ?? "", { shouldValidate: Boolean(conta) })}
        />
        <input type="hidden" {...register("usuario_id")} />
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
        <Input id="estudante-matricula" maxLength={LIMITE.matricula} aria-invalid={Boolean(errors.matricula)} {...register("matricula")} />
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
        <Button type="submit" carregando={isSubmitting}>
          {isSubmitting ? "Cadastrando…" : "Cadastrar estudante"}
        </Button>
      </div>
    </form>
  );
}
