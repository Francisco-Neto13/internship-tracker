import { identidadeDaTela } from "@/lib/acesso-tela";
import { LIMITE } from "@/lib/campos";
import { formatarDataCurta } from "@/lib/datas";
import { formatarCnpj, SITUACAO_CONCEDENTE } from "@/lib/rotulos";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { getConcedente } from "@/modules/concedentes/services/concedente-service";
import { listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { BaixarDocumento } from "@/shared/ui/baixar-documento";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF007: o representante consulta a própria organização e os convênios, e mantém os contatos. O
// gatilho validar_alteracao_concedente recusa qualquer outro campo vindo desse perfil.

async function Organizacao({ identity, concedenteId }: { identity: Awaited<ReturnType<typeof identidadeDaTela>>; concedenteId: string }) {
  const [concedente, convenios] = await Promise.all([getConcedente(identity, concedenteId), listConveniosDaConcedente(identity, concedenteId)]);
  const hoje = dataLocal();
  const situacao = SITUACAO_CONCEDENTE[concedente.situacao];

  return (
    <section aria-label={concedente.razaoSocial} className="flex flex-col gap-4">
      <div className="colunas-alinhadas grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Painel titulo={concedente.razaoSocial} descricao={concedente.nomeFantasia ?? concedente.areaAtuacao} acoes={<StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>}>
            <ListaDefinicao
              colunas={2}
              itens={[
                { rotulo: "CNPJ", valor: <span className="font-mono">{formatarCnpj(concedente.cnpj)}</span> },
                { rotulo: "Área de atuação", valor: concedente.areaAtuacao },
                { rotulo: "Representante legal", valor: [concedente.representanteLegalNome, concedente.representanteLegalCargo].filter(Boolean).join(", ") },
                { rotulo: "Endereço", valor: `${concedente.logradouro}, ${concedente.numeroEndereco}${concedente.complemento ? `, ${concedente.complemento}` : ""} · ${concedente.bairro} · ${concedente.municipio}/${concedente.uf}` },
              ]}
            />
          </Painel>
          <Painel titulo="Convênios" descricao="Sem convênio vigente na data de início, o estágio não é ativado." flush>
            <ul className="divide-y divide-navy-900/[0.07]" data-testid="convenios-organizacao">
              {convenios.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/65">Nenhum convênio registrado.</li>}
              {convenios.map((convenio) => {
                const vigente = convenio.vigenteEm(hoje);
                return (
                  <li key={convenio.id} className="flex flex-col gap-1.5 px-5 py-3 text-sm">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-navy-900">Convênio {convenio.numero}</span>
                      <StatusBadge tone={vigente ? "ok" : "neutral"}>{vigente ? "Vigente" : convenio.situacao === "ATIVO" ? "Fora de vigência" : "Encerrado"}</StatusBadge>
                    </span>
                    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-navy-900/65">
                      {convenio.vigencias.map((vigencia) => (
                        <li key={vigencia.id ?? vigencia.vigenciaInicio} className="flex flex-wrap items-center gap-2">
                          {formatarDataCurta(vigencia.vigenciaInicio)} a {formatarDataCurta(vigencia.vigenciaFim)}
                          <BaixarDocumento documentoId={vigencia.documentoId} rotulo="Baixar PDF" />
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </Painel>
        </div>
        <Painel titulo="Contatos" descricao="Por onde a instituição fala com a sua organização. Para mudar os demais dados, fale com a coordenação do curso.">
          <FormularioApi
            validacao="concedenteEdicao"
            url={`/api/v1/concedentes/${concedenteId}`}
            metodo="PATCH"
            rotuloEnviar="Salvar contatos"
            embutido
            sucesso="Contatos atualizados"
            testId="contatos-organizacao"
            campos={[
              { nome: "email_contato", max: LIMITE.email, rotulo: "E-mail de contato", tipo: "email", valorInicial: concedente.emailContato },
              { nome: "telefone_contato", max: LIMITE.telefone, mascara: "telefone", rotulo: "Telefone", valorInicial: concedente.telefoneContato, vazioComoNulo: true },
            ]}
          />
        </Painel>
      </div>
    </section>
  );
}

export default async function OrganizacaoPage() {
  const identity = await identidadeDaTela("/organizacao");
  const vinculos = await listPerfisVigentes(identity);
  const concedentes = [...new Set(vinculos.flatMap((vinculo) => (vinculo.perfil === "CONCEDENTE" && vinculo.concedenteId ? [vinculo.concedenteId] : [])))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Minha organização" description="Os dados da sua organização no sistema, os convênios com a instituição e os contatos que você mantém." />
      {concedentes.map((concedenteId) => (
        <Organizacao key={concedenteId} identity={identity} concedenteId={concedenteId} />
      ))}
    </div>
  );
}
