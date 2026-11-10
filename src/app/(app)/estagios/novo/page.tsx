import { identidadeDaTela } from "@/lib/acesso-tela";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { NovoEstagioForm } from "./novo-estagio-form";

// RF015: o TCE nasce em edição, em página própria (são treze campos em quatro assuntos, que não
// cabem bem num diálogo). Depois de criado, a formalização segue na página do estágio.
export default async function NovoEstagioPage() {
  const identity = await identidadeDaTela("/estagios/novo");
  const [{ items: estudantes }, { items: concedentes }] = await Promise.all([
    listEstudantes(identity, { page: 1, limit: 100, situacao: "MATRICULADO", ordem: "nome" }),
    listConcedentes(identity, { page: 1, limit: 100, situacao: "ATIVA" }),
  ]);
  const hoje = dataLocal();
  const nomeConcedente = new Map(concedentes.map((concedente) => [concedente.id, concedente.razaoSocial]));
  const convenios = (await Promise.all(concedentes.map((concedente) => listConveniosDaConcedente(identity, concedente.id).catch(() => []))))
    .flat()
    .filter((convenio) => convenio.situacao === "ATIVO" && convenio.vigencias.some((vigencia) => vigencia.vigenciaFim >= hoje));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader voltar={{ href: "/estagios", rotulo: "Estágios" }} title="Novo estágio" description="Cria o Termo de Compromisso em edição. Responsáveis, plano, apólice e assinaturas vêm depois, na página do estágio." />
      {estudantes.length === 0 || convenios.length === 0 ? (
        <EstadoVazio
          variante="indisponivel"
          titulo={estudantes.length === 0 ? "Nenhum estudante matriculado no seu alcance" : "Nenhum convênio vigente"}
          descricao={
            estudantes.length === 0
              ? "O estágio exige estudante matriculado (Lei 11.788/2008, art. 3º, I). Cadastre ou atualize o estudante em Estudantes."
              : "O estágio exige convênio vigente com a concedente na data de início. Registre ou renove o convênio em Concedentes."
          }
        />
      ) : (
        <NovoEstagioForm
          estudantes={estudantes.map((estudante) => ({ id: estudante.id, rotulo: `${estudante.nome ?? "Estudante"} · ${estudante.matricula}` }))}
          convenios={convenios.map((convenio) => ({
            id: convenio.id,
            concedenteId: convenio.concedenteId,
            rotulo: `${nomeConcedente.get(convenio.concedenteId) ?? "Concedente"} · convênio ${convenio.numero}`,
          }))}
        />
      )}
    </div>
  );
}
