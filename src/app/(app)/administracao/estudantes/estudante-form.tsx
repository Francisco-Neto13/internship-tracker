"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const estudanteSchema = z.object({
  usuario_id: z.uuid("Informe um id de usuário válido"),
  curso_id: z.uuid("Selecione um curso"),
  matricula: z.string().trim().min(1, "Informe a matrícula"),
  periodo: z.coerce.number().int().min(1).max(20),
});

// z.coerce leaves the input type as unknown (the string from the form) until parsed;
// the three-generic useForm keeps register() on the raw input and onSubmit on the coerced output
type EstudanteInput = z.input<typeof estudanteSchema>;
type EstudanteOutput = z.output<typeof estudanteSchema>;

const selectClass =
  "h-11 w-full rounded-md border border-navy-900/20 bg-white px-3 text-sm text-navy-900 outline-none transition-colors focus:border-azul-500 focus:ring-2 focus:ring-azul-500/25";

export function EstudanteForm({ cursos }: { cursos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EstudanteInput, unknown, EstudanteOutput>({ resolver: zodResolver(estudanteSchema) });

  async function onSubmit(values: EstudanteOutput) {
    setErro(null);
    const response = await fetch("/api/v1/estudantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json();
      setErro(body.error?.message ?? "Não foi possível cadastrar o estudante.");
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="surface-card grid gap-4 p-5 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="estudante-usuario">Id do usuário</Label>
        <Input
          id="estudante-usuario"
          placeholder="uuid de um usuário já cadastrado (RF001 ainda sem tela)"
          aria-invalid={Boolean(errors.usuario_id)}
          {...register("usuario_id")}
        />
        {errors.usuario_id && <p className="text-sm text-status-danger-text">{errors.usuario_id.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estudante-curso">Curso</Label>
        <select id="estudante-curso" className={selectClass} {...register("curso_id")}>
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
        <Input
          id="estudante-periodo"
          type="number"
          aria-invalid={Boolean(errors.periodo)}
          {...register("periodo")}
        />
        {errors.periodo && <p className="text-sm text-status-danger-text">{errors.periodo.message}</p>}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="sm:col-span-2 sm:w-fit">
        {isSubmitting ? "Salvando..." : "Cadastrar estudante"}
      </Button>
    </form>
  );
}
