import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { ROTULO_PERFIL, type Perfil } from "@/modules/acesso/schemas/perfil";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { itensVisiveis, type NavItem } from "@/shared/ui/navigation";
import { PageHeader } from "@/shared/ui/page-header";

// Hub da administração por natureza da função (pessoas, acadêmico, parcerias, configuração,
// conformidade), com o alcance de cada uma e a consequência de alterá-la, para que a pessoa
// saiba o que mexe em quê antes de entrar. As funções e quem as vê vêm de NAVEGACAO.

const AREAS: { titulo: string; descricao: string; hrefs: { href: string; alcance: string; consequencia: string }[] }[] = [
  {
    titulo: "Pessoas e acesso",
    descricao: "Quem entra no sistema e o que cada pessoa pode fazer.",
    hrefs: [
      {
        href: "/administracao/usuarios",
        alcance: "Somente administrador",
        consequencia: "Inativar ou retirar um perfil corta o acesso na requisição seguinte (RNF-03). Contas não são apagadas.",
      },
    ],
  },
  {
    titulo: "Gestão acadêmica",
    descricao: "Estudantes e cursos: a base de toda exigência de estágio e de atividades.",
    hrefs: [
      {
        href: "/administracao/estudantes",
        alcance: "Coordenação vê só os estudantes dos cursos que coordena",
        consequencia: "A situação acadêmica segue transições fixas; um estudante trancado não ativa estágio.",
      },
      {
        href: "/administracao/cursos",
        alcance: "Coordenação altera só os próprios cursos",
        consequencia: "Mudar carga mínima ou exigências reapura a integralização de todos os estudantes do curso.",
      },
    ],
  },
  {
    titulo: "Parcerias",
    descricao: "Organizações que recebem estagiários e os convênios que permitem os estágios.",
    hrefs: [
      {
        href: "/administracao/concedentes",
        alcance: "Coordenação e administrador",
        consequencia: "Suspender uma concedente impede novas ativações; os estágios em andamento seguem válidos.",
      },
      {
        href: "/administracao/convenios",
        alcance: "Coordenação e administrador",
        consequencia: "Sem convênio vigente na data de início, o estágio não é ativado (RF010).",
      },
    ],
  },
  {
    titulo: "Configurações institucionais",
    descricao: "Regras gerais que todos os cursos seguem.",
    hrefs: [
      {
        href: "/administracao/parametros",
        alcance: "Somente administrador",
        consequencia: "Valem a partir da data de vigência; lançamentos anteriores mantêm o parâmetro que foi aplicado.",
      },
    ],
  },
  {
    titulo: "Relatórios e conformidade",
    descricao: "Visão gerencial, guarda dos documentos e trilha de auditoria.",
    hrefs: [
      { href: "/administracao/relatorios-gerenciais", alcance: "Administrador vê todos os cursos; coordenação, os seus", consequencia: "Somente leitura, com exportação em CSV e PDF." },
      { href: "/administracao/guarda-documental", alcance: "Somente administrador", consequencia: "Eliminar remove o arquivo de forma definitiva; o registro e o hash permanecem." },
      { href: "/administracao/auditoria", alcance: "Somente administrador", consequencia: "Somente leitura: a trilha não aceita alteração nem exclusão (RN-28)." },
    ],
  },
];

function Cartao({ item, alcance, consequencia }: { item: NavItem; alcance: string; consequencia: string }) {
  const Icone = item.icon;
  return (
    <Link
      href={item.href}
      className="group surface-card flex flex-col gap-3 p-5 transition-colors hover:border-azul-500/40 hover:bg-nevoa-50 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-nevoa-100 text-navy-700">
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-semibold text-navy-900">
            {item.titulo}
            <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
          </p>
          <p className="mt-0.5 text-sm text-navy-900/65">{item.descricao}</p>
        </div>
      </div>
      <dl className="mt-auto grid gap-2 border-t border-navy-900/[0.07] pt-3 text-xs">
        <div>
          <dt className="font-medium text-navy-900/60">Alcance</dt>
          <dd className="text-navy-900/80">{alcance}</dd>
        </div>
        <div>
          <dt className="font-medium text-navy-900/60">Ao alterar</dt>
          <dd className="text-navy-900/80">{consequencia}</dd>
        </div>
      </dl>
    </Link>
  );
}

export default async function AdministracaoPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const perfis = (await listPerfisVigentes(identity)).map((vinculo) => vinculo.perfil as Perfil);
  const visiveis = new Map(itensVisiveis(perfis).map((item) => [item.href, item]));
  const areas = AREAS.map((area) => ({ ...area, itens: area.hrefs.flatMap((entrada) => (visiveis.has(entrada.href) ? [{ ...entrada, item: visiveis.get(entrada.href)! }] : [])) })).filter(
    (area) => area.itens.length > 0,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Administração"
        description={`O que o seu perfil (${perfis.map((perfil) => ROTULO_PERFIL[perfil]).join(", ")}) pode configurar, com o alcance e o efeito de cada função.`}
      />
      {areas.map((area) => (
        <section key={area.titulo} aria-labelledby={`area-${area.titulo}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`area-${area.titulo}`} className="text-base font-semibold text-navy-900">
              {area.titulo}
            </h2>
            <p className="text-sm text-navy-900/60">{area.descricao}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {area.itens.map(({ item, alcance, consequencia }) => (
              <Cartao key={item.href} item={item} alcance={alcance} consequencia={consequencia} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
