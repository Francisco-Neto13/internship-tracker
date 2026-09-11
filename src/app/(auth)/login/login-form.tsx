"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email("Informe um e-mail valido"),
  senha: z.string().min(1, "Informe a senha"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setErro(null);
    const { error } = await authClient.signIn.email({ email: values.email, password: values.senha });
    if (error) {
      // Same message for unknown e-mail and wrong password, so accounts cannot be enumerated
      setErro(error.status === 403 ? "Usuario inativo." : "E-mail ou senha incorretos.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          autoComplete="username"
          className="rounded border border-zinc-300 px-3 py-2"
          {...register("email")}
        />
        {errors.email && <span className="text-red-700">{errors.email.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-3 py-2"
          {...register("senha")}
        />
        {errors.senha && <span className="text-red-700">{errors.senha.message}</span>}
      </label>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
