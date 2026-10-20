import { authenticatedRoute, dataResponse } from "@/lib/api";
import { catalogoPerfis } from "@/modules/acesso/domain/catalogo-perfis";

// RF003: what each profile reaches. Descriptive only: RLS enforces it.
export const GET = authenticatedRoute(async () =>
  dataResponse(
    catalogoPerfis().map((entrada) => ({
      perfil: entrada.perfil,
      rotulo: entrada.rotulo,
      alcance: entrada.alcance,
      exige_curso: entrada.exigeCurso,
      disponivel: entrada.disponivel,
    })),
  ),
);
