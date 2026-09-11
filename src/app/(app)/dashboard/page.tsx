import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";

const ROTULO_PERFIL: Record<string, string> = {
  ESTUDANTE: "Estudante",
  PROFESSOR_ORIENTADOR: "Professor orientador",
  SUPERVISOR: "Supervisor",
  COORDENACAO: "Coordenacao",
  CONCEDENTE: "Concedente",
  ADMINISTRADOR: "Administrador",
};

export default async function DashboardPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const perfis = await listPerfisVigentes(identity);

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Painel</h1>
      <h2 className="text-sm font-medium text-zinc-600">Perfis vigentes</h2>
      {perfis.length === 0 ? (
        <p className="text-sm">Nenhum perfil vigente.</p>
      ) : (
        <ul data-testid="perfis-vigentes" className="list-disc pl-5 text-sm">
          {perfis.map((vinculo) => (
            <li key={`${vinculo.perfil}-${vinculo.cursoId ?? "geral"}`}>{ROTULO_PERFIL[vinculo.perfil]}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
