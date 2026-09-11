import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getIdentity()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Entrar</h1>
        <LoginForm />
      </div>
    </main>
  );
}
