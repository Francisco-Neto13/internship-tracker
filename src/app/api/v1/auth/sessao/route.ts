import { authenticatedRoute, dataResponse } from "@/lib/api";
import { getSession } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";

// RF003: authenticated user and the profiles in force, so the interface can shape navigation
export const GET = authenticatedRoute(async ({ identity }) => {
  const [session, perfis] = await Promise.all([getSession(), listPerfisVigentes(identity)]);
  return dataResponse({
    usuario: session?.user ?? null,
    perfis: perfis.map((vinculo) => ({ perfil: vinculo.perfil, curso_id: vinculo.cursoId })),
  });
});
