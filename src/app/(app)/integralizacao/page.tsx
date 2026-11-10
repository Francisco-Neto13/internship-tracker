import { DomainError } from "@/lib/errors";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { DeclaracoesEstudante } from "./declaracoes";
import { ProgressoIntegralizacao } from "./progresso";

// RF057, RN-24: the student's integralization at any moment. The coordination sees each
// student's on the student's page (Administração > Estudantes).
export default async function IntegralizacaoPage() {
  const identity = await identidadeDaTela("/integralizacao");
  const integralizacao = await getMinhaIntegralizacao(identity).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") return null;
    throw error;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Integralização curricular" description="Quanto você já cumpriu do estágio obrigatório e das atividades complementares exigidos pelo curso, e as declarações emitidas." />
      {integralizacao ? (
        <>
          <ProgressoIntegralizacao integralizacao={integralizacao} />
          <DeclaracoesEstudante
            identity={identity}
            estudanteId={integralizacao.estudanteId}
            atividadesCumpridas={integralizacao.apuracao.atividadesAproveitadoMinutos >= integralizacao.apuracao.atividadesExigidoMinutos}
          />
        </>
      ) : (
        <EstadoVazio variante="vazio" titulo="Disponível para estudantes" descricao="A coordenação consulta a integralização de cada estudante na página do estudante." />
      )}
    </div>
  );
}
