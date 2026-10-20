import { authenticatedRoute, dataResponse } from "@/lib/api";
import { getSession } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";

// RF003: authenticated user and the profiles in force, so the interface can shape navigation.
// RF002: reachable during a pending password change, so the interface can send the user there.
export const GET = authenticatedRoute(
  async ({ identity }) => {
    const [session, perfis] = await Promise.all([getSession(), listPerfisVigentes(identity)]);
    const usuario = session?.user;
    return dataResponse({
      usuario: usuario
        ? {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            troca_senha_obrigatoria: usuario.trocaSenhaObrigatoria,
            senha_provisoria_expira_em: usuario.senhaProvisoriaExpiraEm?.toISOString() ?? null,
          }
        : null,
      perfis: perfis.map((vinculo) => ({ perfil: vinculo.perfil, curso_id: vinculo.cursoId })),
    });
  },
  { permitirTrocaSenhaPendente: true },
);
