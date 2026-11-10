import { redirect } from "next/navigation";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { podeAbrir } from "@/shared/ui/navigation";
import type { Identity } from "./identity";
import { getIdentity } from "./session";

/**
 * Identity of a screen restricted by profile (RF003): without a session goes to the login, without
 * the profile goes to /sem-acesso. This only spares people a screen that is not theirs; the API
 * and the RLS still decide every read and write.
 */
export async function identidadeDaTela(caminho: string): Promise<Identity> {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const vinculos = await listPerfisVigentes(identity);
  if (!podeAbrir(caminho, vinculos.map((vinculo) => vinculo.perfil))) redirect("/sem-acesso");
  return identity;
}
