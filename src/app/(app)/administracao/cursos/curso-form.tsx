"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const cursoSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código"),
  nome: z.string().trim().min(1, "Informe o nome"),
  carga_minima_estagio_horas: z.coerce.number().int().min(1, "Informe a carga mínima de estágio"),
  carga_atividades_complementares_horas: z.coerce.number().int().min(0),
});

// z.coerce leaves the input type as unknown (the string from the form) until parsed;
// the three-generic useForm keeps register() on the raw input and onSubmit on the coerced output
type CursoInput = z.input<typeof cursoSchema>;
type CursoOutput = z.output<typeof cursoSchema>;

export function CursoForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CursoInput, unknown, CursoOutput>({ resolver: zodResolver(cursoSchema) });

  async function onSubmit(values: CursoOutput) {
    setErro(null);
    const response = await fetch("/api/v1/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json();
      setErro(body.error?.message ?? "Não foi possível cadastrar o curso.");
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="surface-card grid gap-4 p-5 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="curso-codigo">Código</Label>
        <Input id="curso-codigo" aria-invalid={Boolean(errors.codigo)} {...register("codigo")} />
        {errors.codigo && <p className="text-sm text-status-danger-text">{errors.codigo.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="curso-nome">Nome</Label>
        <Input id="curso-nome" aria-invalid={Boolean(errors.nome)} {...register("nome")} />
        {errors.nome && <p className="text-sm text-status-danger-text">{errors.nome.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="curso-estagio">Carga mínima de estágio (horas)</Label>
        <Input
          id="curso-estagio"
          type="number"
          aria-invalid={Boolean(errors.carga_minima_estagio_horas)}
          {...register("carga_minima_estagio_horas")}
        />
        {errors.carga_minima_estagio_horas && (
          <p className="text-sm text-status-danger-text">{errors.carga_minima_estagio_horas.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="curso-atividades">Carga de atividades complementares (horas)</Label>
        <Input
          id="curso-atividades"
          type="number"
          aria-invalid={Boolean(errors.carga_atividades_complementares_horas)}
          {...register("carga_atividades_complementares_horas")}
        />
        {errors.carga_atividades_complementares_horas && (
          <p className="text-sm text-status-danger-text">{errors.carga_atividades_complementares_horas.message}</p>
        )}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-status-danger-text sm:col-span-2">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="sm:col-span-2 sm:w-fit">
        {isSubmitting ? "Salvando..." : "Cadastrar curso"}
      </Button>
    </form>
  );
}
