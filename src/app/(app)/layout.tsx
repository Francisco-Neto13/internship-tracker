import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

// Redirect is a convenience for navigation; data stays protected by RLS through
// withUser even if a page forgets to check the session (RF003)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <span className="font-semibold">Internship Tracker</span>
        <div className="flex items-center gap-4 text-sm">
          <span data-testid="usuario-autenticado">{session.user.nome}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
