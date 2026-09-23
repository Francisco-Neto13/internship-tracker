import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Clock,
  FileSignature,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Sliders,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Perfil } from "@/modules/acesso/schemas/perfil";

export type NavStatus = "ativo" | "em-construcao";

export type NavItem = {
  href: string;
  titulo: string;
  descricao: string;
  modulo: string;
  rf: string;
  perfis: Perfil[] | "todos";
  status: NavStatus;
  icon: LucideIcon;
  children?: NavItem[];
};

/**
 * Mapeamento das telas do sistema, a partir de REQUISITOSEREGRAS.MD Secao 8.3 (Principais
 * Telas), da tabela de modulos do AGENTS.md e do alcance por perfil de ARQUITETURA.MD Secao
 * 6.1. E a fonte unica da navegacao: o layout autenticado filtra por perfil
 * (src/app/(app)/layout.tsx), o painel usa o mesmo registro para os atalhos
 * (src/app/(app)/dashboard/page.tsx), e toda rota ainda sem modulo implementado renderiza a
 * partir daqui (src/shared/ui/placeholder-route.tsx), para o menu nunca divergir da tela.
 *
 * `status: "ativo"` significa que a tabela, a politica RLS e a tela existem. As demais
 * telas dependem de tabelas que ainda nao foram migradas (Fases 2 a 5 do roadmap).
 */
export const NAVEGACAO: NavItem[] = [
  {
    href: "/dashboard",
    titulo: "Painel",
    descricao: "Pendências, carga horária, relatórios e atividades de acordo com o perfil.",
    modulo: "Transversal",
    rf: "Seção 8.3",
    perfis: "todos",
    status: "ativo",
    icon: LayoutDashboard,
  },
  {
    href: "/estagios",
    titulo: "Gestão de Estágios",
    descricao:
      "TCE, plano de atividades, responsáveis, apólice, assinaturas, aditivos, afastamento e rescisão.",
    modulo: "M04 Gestão de Estágios",
    rf: "RF015-RF022, RF031-RF035, RF044-RF047, RF059-RF064",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "COORDENACAO", "CONCEDENTE"],
    status: "em-construcao",
    icon: Briefcase,
  },
  {
    href: "/frequencia",
    titulo: "Frequência e Carga Horária",
    descricao: "Registro de horas, homologação pelo supervisor e divergências para o orientador.",
    modulo: "M05 Acompanhamento",
    rf: "RF023-RF030",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "COORDENACAO"],
    status: "em-construcao",
    icon: Clock,
  },
  {
    href: "/relatorios",
    titulo: "Relatórios",
    descricao: "Envio de relatórios periódicos e final, análise e devolução pelo orientador.",
    modulo: "M05 Acompanhamento",
    rf: "RF036-RF043",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "COORDENACAO"],
    status: "em-construcao",
    icon: FileText,
  },
  {
    href: "/atividades-complementares",
    titulo: "Atividades Complementares",
    descricao: "Cadastro de atividades, comprovantes e análise pela coordenação.",
    modulo: "M06 Atividades Complementares",
    rf: "RF048-RF055",
    perfis: ["ESTUDANTE", "COORDENACAO"],
    status: "em-construcao",
    icon: Award,
  },
  {
    href: "/integralizacao",
    titulo: "Integralização Curricular",
    descricao: "Carga cumprida, progresso por categoria e comprovantes de conclusão.",
    modulo: "M07 Integralização",
    rf: "RF056-RF058",
    perfis: ["ESTUDANTE", "COORDENACAO"],
    status: "em-construcao",
    icon: ListChecks,
  },
  {
    href: "/notificacoes",
    titulo: "Notificações",
    descricao: "Alertas de prazos e pendências, somente dentro do sistema.",
    modulo: "Transversal",
    rf: "RF012, RF035, RF040, RF070",
    perfis: "todos",
    status: "em-construcao",
    icon: Bell,
  },
  {
    href: "/administracao",
    titulo: "Administração",
    descricao:
      "Usuários, cursos, concedentes, convênios, parâmetros institucionais, relatórios gerenciais e auditoria.",
    modulo: "M01, M02, M03, M08",
    rf: "Seção 8.3",
    perfis: ["COORDENACAO", "ADMINISTRADOR"],
    status: "ativo",
    icon: Settings,
    children: [
      {
        href: "/administracao/usuarios",
        titulo: "Usuários",
        descricao: "Cadastro, edição e inativação de usuários e vínculos de perfil.",
        modulo: "M01 Acesso e Usuários",
        rf: "RF001-RF003",
        perfis: ["ADMINISTRADOR"],
        status: "em-construcao",
        icon: Users,
      },
      {
        href: "/administracao/cursos",
        titulo: "Cursos",
        descricao: "Cursos, carga mínima de estágio e carga de atividades complementares.",
        modulo: "M02 Gestão Acadêmica",
        rf: "RF004",
        perfis: ["ADMINISTRADOR", "COORDENACAO"],
        status: "ativo",
        icon: BookOpen,
      },
      {
        href: "/administracao/estudantes",
        titulo: "Estudantes",
        descricao: "Matrícula, curso e situação acadêmica de cada estudante.",
        modulo: "M02 Gestão Acadêmica",
        rf: "RF005",
        perfis: ["ADMINISTRADOR", "COORDENACAO"],
        status: "ativo",
        icon: GraduationCap,
      },
      {
        href: "/administracao/concedentes",
        titulo: "Concedentes",
        descricao: "Dados institucionais, situação (ativa ou suspensa) e histórico de estágios.",
        modulo: "M03 Concedentes e Convênios",
        rf: "RF007-RF008, RF013-RF014",
        perfis: ["COORDENACAO", "ADMINISTRADOR"],
        status: "em-construcao",
        icon: Building2,
      },
      {
        href: "/administracao/convenios",
        titulo: "Convênios",
        descricao: "Vigência, renovação e alerta de convênios a vencer.",
        modulo: "M03 Concedentes e Convênios",
        rf: "RF009-RF012",
        perfis: ["COORDENACAO", "ADMINISTRADOR"],
        status: "em-construcao",
        icon: FileSignature,
      },
      {
        href: "/administracao/parametros",
        titulo: "Parâmetros Institucionais",
        descricao: "Limites de jornada, duração máxima, tolerância de divergência e prazo de guarda.",
        modulo: "M02 Gestão Acadêmica",
        rf: "RF006",
        perfis: ["ADMINISTRADOR"],
        status: "em-construcao",
        icon: Sliders,
      },
      {
        href: "/administracao/relatorios-gerenciais",
        titulo: "Relatórios Gerenciais",
        descricao: "Estagiários ativos, concedentes parceiras, taxa de conclusão e pendências.",
        modulo: "M08 Administração e Controle",
        rf: "RF067-RF068",
        perfis: ["COORDENACAO", "ADMINISTRADOR"],
        status: "em-construcao",
        icon: BarChart3,
      },
      {
        href: "/administracao/auditoria",
        titulo: "Auditoria",
        descricao: "Trilha de operações relevantes, somente leitura.",
        modulo: "M08 Administração e Controle",
        rf: "RF065-RF066",
        perfis: ["ADMINISTRADOR"],
        status: "ativo",
        icon: ShieldCheck,
      },
    ],
  },
];

function pertence(perfisDoItem: NavItem["perfis"], perfisDoUsuario: Set<Perfil>): boolean {
  return perfisDoItem === "todos" || perfisDoItem.some((perfil) => perfisDoUsuario.has(perfil));
}

/** Filters NAVEGACAO (and each item's children) by the profiles in force for the user (RF003). */
export function itensVisiveis(perfisDoUsuario: Perfil[]): NavItem[] {
  const conjunto = new Set(perfisDoUsuario);
  return NAVEGACAO.filter((item) => pertence(item.perfis, conjunto)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => pertence(child.perfis, conjunto)),
  }));
}

/** Looks an item up by href, including children, regardless of the viewer's profile. */
export function encontrarItem(href: string): NavItem | undefined {
  for (const item of NAVEGACAO) {
    if (item.href === href) return item;
    const filho = item.children?.find((child) => child.href === href);
    if (filho) return filho;
  }
  return undefined;
}
