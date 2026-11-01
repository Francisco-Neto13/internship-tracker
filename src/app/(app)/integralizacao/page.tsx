import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { ProgressoIntegralizacao } from "./progresso";

// RF057, RN-24: the student's integralization at any moment. The coordination sees each
// student's on the student's page (Administração > Estudantes).
export default async function IntegralizacaoPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const integralizacao = await getMinhaIntegralizacao(identity).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") return null;
    throw error;
  });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M07 Integralização" title="Integralização curricular" description="Estágio obrigatório e atividades complementares frente às exigências do curso (RF056, RF057)." />
      {integralizacao ? (
        <ProgressoIntegralizacao integralizacao={integralizacao} />
      ) : (
        <EstadoVazio variante="vazio" titulo="Disponível para estudantes" descricao="A coordenação consulta a integralização de cada estudante na página do estudante." />
      )}
    </section>
  );
}
