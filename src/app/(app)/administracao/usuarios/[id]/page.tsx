import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataHora } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { SITUACAO_ACADEMICA, SITUACAO_USUARIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { catalogoPerfis } from "@/modules/acesso/domain/catalogo-perfis";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { idParamSchema } from "@/modules/acesso/schemas/usuario";
import { getUsuario } from "@/modules/acesso/services/usuario-service";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { Avatar } from "@/shared/ui/avatar";
import { Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { DadosConta, PerfisConta, SegurancaConta } from "./usuario-acoes";

// RF001-RF003: a conta de acesso de uma pessoa: dados de login, perfis e vínculos vigentes,
// segurança e o histórico de vínculos. Se a conta tem perfil acadêmico (estudante), o atalho
// leva até ele: são registros distintos, com permissões distintas.

export default async function UsuarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;
  const consulta = lerConsulta(await searchParams);
  const voltar = consulta.voltar?.startsWith("/administracao/usuarios") ? consulta.voltar : "/administracao/usuarios";

  const usuario = await getUsuario(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const [{ items: cursos }, { items: concedentes }, { items: academicos }] = await Promise.all([
    listCursos(identity, { page: 1, limit: 100 }),
    listConcedentes(identity, { page: 1, limit: 100 }),
    listEstudantes(identity, { page: 1, limit: 5, usuarioId: id }),
  ]);
  const nomeCurso = new Map(cursos.map((curso) => [curso.id, curso.nome]));
  const nomeConcedente = new Map(concedentes.map((concedente) => [concedente.id, concedente.razaoSocial]));
  const situacao = SITUACAO_USUARIO[usuario.situacao];
  const escopo = (vinculo: { cursoId: string | null; concedenteId: string | null }) =>
    vinculo.cursoId ? nomeCurso.get(vinculo.cursoId) ?? "curso" : vinculo.concedenteId ? nomeConcedente.get(vinculo.concedenteId) ?? "concedente" : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: voltar, rotulo: "Usuários e acesso" }}
        identidade={<Avatar nome={usuario.nome} semente={usuario.id} tamanho="xl" />}
        title={usuario.nome}
        description={usuario.email}
        meta={
          <>
            <StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>
            {usuario.trocaSenhaObrigatoria && (
              <StatusBadge tone="pending">
                Troca de senha pendente{usuario.senhaProvisoriaExpiraEm ? ` · expira ${formatarDataHora(usuario.senhaProvisoriaExpiraEm)}` : ""}
              </StatusBadge>
            )}
            <span>Conta criada em {formatarDataHora(usuario.criadoEm)}</span>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Painel titulo="Dados da conta" descricao="Nome exibido e e-mail usado no login.">
            <DadosConta usuario={{ id: usuario.id, nome: usuario.nome, email: usuario.email }} />
          </Painel>
          <Painel titulo="Perfis e vínculos" descricao="O perfil sozinho não dá acesso: coordenação vale para o curso, supervisor e concedente para a organização escolhida (RF003).">
            <PerfisConta
              usuarioId={usuario.id}
              perfis={usuario.perfis.map((vinculo) => ({ perfil: vinculo.perfil, curso_id: vinculo.cursoId, concedente_id: vinculo.concedenteId }))}
              catalogo={catalogoPerfis()}
              cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))}
              concedentes={concedentes.map((concedente) => ({ id: concedente.id, nome: concedente.razaoSocial }))}
            />
          </Painel>
        </div>
        <div className="flex flex-col gap-4">
          <Painel titulo="Segurança e acesso">
            <SegurancaConta usuario={{ id: usuario.id, nome: usuario.nome, situacao: usuario.situacao }} />
          </Painel>
          {academicos.length > 0 && (
            <Painel titulo="Perfil acadêmico" flush>
              <ul className="divide-y divide-navy-900/[0.07]">
                {academicos.map((estudante) => (
                  <li key={estudante.id}>
                    <Link href={`/administracao/estudantes/${estudante.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-nevoa-50 focus-visible:bg-nevoa-50 focus-visible:outline-none">
                      <GraduationCap className="size-5 text-navy-700" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{estudante.cursoNome ?? "Curso"}</span>
                        <span className="block text-xs text-navy-900/60">Matrícula {estudante.matricula}</span>
                      </span>
                      <StatusBadge tone={SITUACAO_ACADEMICA[estudante.situacaoAcademica].tom}>{SITUACAO_ACADEMICA[estudante.situacaoAcademica].rotulo}</StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Painel>
          )}
          <Painel titulo="Histórico de vínculos" descricao="Cada troca de perfil fecha o vínculo anterior; nada é apagado." flush>
            <ol className="divide-y divide-navy-900/[0.07]" data-testid="historico-vinculos">
              {usuario.historico.map((vinculo) => (
                <li key={vinculo.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm">
                  <span className="flex items-center gap-2 text-navy-900">
                    <span className={`size-2 rounded-full ${vinculo.vigenciaFim ? "bg-navy-900/25" : "bg-status-ok-text"}`} aria-hidden />
                    {ROTULO_PERFIL[vinculo.perfil]}
                    {escopo(vinculo) && <span className="text-navy-900/60">· {escopo(vinculo)}</span>}
                  </span>
                  <span className="pl-4 text-xs text-navy-900/55">
                    {formatarDataHora(vinculo.vigenciaInicio)} até {vinculo.vigenciaFim ? formatarDataHora(vinculo.vigenciaFim) : "hoje (vigente)"}
                  </span>
                </li>
              ))}
            </ol>
          </Painel>
        </div>
      </div>
    </div>
  );
}
