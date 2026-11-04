"use client";

import { LIMITE, SENHA_MAXIMO } from "@/lib/campos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { CampoSenha } from "@/shared/ui/campo-senha";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
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
    // Nothing this long can be right; same answer as a wrong password
    if (values.senha.length > SENHA_MAXIMO) return setErro("E-mail ou senha incorretos.");
    const { error } = await authClient.signIn.email({ email: values.email, password: values.senha });
    if (error) {
      // Same message for unknown e-mail and wrong password, so accounts cannot be enumerated.
      // The 403 reasons come only after the password matched (session hook in src/lib/auth.ts).
      if (error.status === 429) {
        // Better Auth allows 3 sign-in attempts per 10 seconds per address
        setErro("Muitas tentativas seguidas. Aguarde alguns segundos e tente de novo.");
      } else if (error.code === "SENHA_PROVISORIA_EXPIRADA") {
        setErro("Senha provisória expirada. Solicite uma nova ao administrador.");
      } else {
        setErro(error.status === 403 ? "Usuário inativo." : "E-mail ou senha incorretos.");
      }
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          maxLength={LIMITE.email}
          autoComplete="username"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-status-danger-text">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <CampoSenha id="login-password" autoComplete="current-password" aria-invalid={Boolean(errors.senha)} {...register("senha")} />
        {errors.senha && <p className="text-sm text-status-danger-text">{errors.senha.message}</p>}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-status-danger-text">
          {erro}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
