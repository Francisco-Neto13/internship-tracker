import {
  Archive,
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
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  Sliders,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Perfil } from "@/modules/acesso/schemas/perfil";

export type NavGrupo = "geral" | "estagios" | "formacao" | "academico" | "parcerias" | "administracao";

export type NavItem = {
  href: string;
  titulo: string;
  /** Rótulo da barra lateral quando o título não cabe (a sidebar trunca em ~22 caracteres). */
  curto?: string;
  descricao: string;
  modulo: string;
  rf: string;
  perfis: Perfil[] | "todos";
  grupo: NavGrupo;
  icon: LucideIcon;
};

/** Ordem e nome dos grupos da barra lateral: por área de trabalho, não por módulo técnico. */
export const GRUPOS: { chave: NavGrupo; titulo: string }[] = [
  { chave: "geral", titulo: "Visão geral" },
  { chave: "estagios", titulo: "Estágios" },
  { chave: "formacao", titulo: "Formação" },
  { chave: "academico", titulo: "Acadêmico" },
  { chave: "parcerias", titulo: "Parcerias" },
  { chave: "administracao", titulo: "Administração" },
];

/**
 * Fonte única da navegação, a partir de REQUISITOSEREGRAS.MD §8.3 e do alcance por perfil de
 * ARQUITETURA.MD §6.1: a barra lateral filtra por perfil, a topbar lê o título daqui, o painel e
 * a página de administração montam os atalhos daqui. Esconder um item não é a proteção (a RLS
 * é): é só para ninguém ver um caminho que não leva a nada para o seu perfil.
 */
export const NAVEGACAO: NavItem[] = [
  {
    href: "/dashboard",
    titulo: "Painel",
    descricao: "O que pede atenção agora, de acordo com o seu perfil.",
    modulo: "Visão geral",
    rf: "Seção 8.3",
    perfis: "todos",
    grupo: "geral",
    icon: LayoutDashboard,
  },
  {
    href: "/notificacoes",
    titulo: "Notificações",
    descricao: "Prazos, pendências e mudanças de situação, somente dentro do sistema.",
    modulo: "Visão geral",
    rf: "RF012, RF035, RF040, RF070",
    perfis: "todos",
    grupo: "geral",
    icon: Bell,
  },
  {
    href: "/estagios",
    titulo: "Estágios",
    descricao: "Formalização, acompanhamento, ocorrências e encerramento de cada estágio.",
    modulo: "M04 Gestão de Estágios",
    rf: "RF015-RF022, RF031-RF035, RF044-RF047, RF059-RF064",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "COORDENACAO", "CONCEDENTE"],
    grupo: "estagios",
    icon: Briefcase,
  },
  {
    href: "/frequencia",
    titulo: "Frequência e carga horária",
    curto: "Frequência",
    descricao: "Registro de horas, homologação pelo supervisor e divergências para o orientador.",
    modulo: "M05 Acompanhamento",
    rf: "RF023-RF030",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "COORDENACAO"],
    grupo: "estagios",
    icon: Clock,
  },
  {
    href: "/relatorios",
    titulo: "Relatórios de estágio",
    curto: "Relatórios",
    descricao: "Relatórios periódicos e final: envio, análise e devolução pelo orientador.",
    modulo: "M05 Acompanhamento",
    rf: "RF036-RF043",
    perfis: ["ESTUDANTE", "PROFESSOR_ORIENTADOR", "COORDENACAO"],
    grupo: "estagios",
    icon: FileText,
  },
  {
    href: "/atividades-complementares",
    titulo: "Atividades complementares",
    curto: "Atividades",
    descricao: "Cadastro com comprovante e análise pela coordenação, dentro dos limites do curso.",
    modulo: "M06 Atividades Complementares",
    rf: "RF048-RF055",
    perfis: ["ESTUDANTE", "COORDENACAO"],
    grupo: "formacao",
    icon: Award,
  },
  {
    href: "/integralizacao",
    titulo: "Integralização curricular",
    curto: "Integralização",
    descricao: "Carga cumprida frente às exigências do curso, por categoria, e declarações.",
    modulo: "M07 Integralização",
    rf: "RF056-RF058",
    perfis: ["ESTUDANTE"],
    grupo: "formacao",
    icon: ListChecks,
  },
  {
    href: "/administracao/estudantes",
    titulo: "Estudantes",
    descricao: "Perfil acadêmico: matrícula, curso, situação, estágios e integralização.",
    modulo: "M02 Gestão Acadêmica",
    rf: "RF005",
    perfis: ["ADMINISTRADOR", "COORDENACAO"],
    grupo: "academico",
    icon: GraduationCap,
  },
  {
    href: "/administracao/cursos",
    titulo: "Cursos",
    descricao: "Carga mínima de estágio, atividades complementares, categorias e periodicidade.",
    modulo: "M02 Gestão Acadêmica",
    rf: "RF004",
    perfis: ["ADMINISTRADOR", "COORDENACAO"],
    grupo: "academico",
    icon: BookOpen,
  },
  {
    href: "/administracao/concedentes",
    titulo: "Concedentes",
    descricao: "Organizações que recebem estagiários: dados, situação e histórico.",
    modulo: "M03 Concedentes e Convênios",
    rf: "RF007-RF008, RF013-RF014",
    perfis: ["COORDENACAO", "ADMINISTRADOR"],
    grupo: "parcerias",
    icon: Building2,
  },
  {
    href: "/administracao/convenios",
    titulo: "Convênios",
    descricao: "Vigência, renovação e convênios a vencer.",
    modulo: "M03 Concedentes e Convênios",
    rf: "RF009-RF012",
    perfis: ["COORDENACAO", "ADMINISTRADOR"],
    grupo: "parcerias",
    icon: FileSignature,
  },
  {
    href: "/administracao",
    titulo: "Administração",
    curto: "Visão da administração",
    descricao: "Configurações, pessoas e acesso, relatórios e conformidade, com o alcance de cada uma.",
    modulo: "Administração",
    rf: "M01, M02, M08",
    perfis: ["COORDENACAO", "ADMINISTRADOR"],
    grupo: "administracao",
    icon: LayoutGrid,
  },
  {
    href: "/administracao/usuarios",
    titulo: "Usuários e acesso",
    descricao: "Contas, situação, perfis e vínculos; senha provisória.",
    modulo: "M01 Acesso e Usuários",
    rf: "RF001-RF003",
    perfis: ["ADMINISTRADOR"],
    grupo: "administracao",
    icon: Users,
  },
  {
    href: "/administracao/relatorios-gerenciais",
    titulo: "Relatórios gerenciais",
    descricao: "Estagiários ativos, concedentes parceiras, taxa de conclusão e pendências.",
    modulo: "M08 Administração e Controle",
    rf: "RF067-RF068",
    perfis: ["COORDENACAO", "ADMINISTRADOR"],
    grupo: "administracao",
    icon: BarChart3,
  },
  {
    href: "/administracao/parametros",
    titulo: "Parâmetros institucionais",
    curto: "Parâmetros",
    descricao: "Limites de jornada, duração máxima, tolerância de divergência e prazo de guarda.",
    modulo: "M02 Gestão Acadêmica",
    rf: "RF006",
    perfis: ["ADMINISTRADOR"],
    grupo: "administracao",
    icon: Sliders,
  },
  {
    href: "/administracao/guarda-documental",
    titulo: "Guarda documental",
    descricao: "Documentos com prazo de guarda atingido e eliminação do arquivo.",
    modulo: "M08 Administração e Controle",
    rf: "RF069",
    perfis: ["ADMINISTRADOR"],
    grupo: "administracao",
    icon: Archive,
  },
  {
    href: "/administracao/auditoria",
    titulo: "Auditoria",
    descricao: "Trilha de operações relevantes, somente leitura.",
    modulo: "M08 Administração e Controle",
    rf: "RF065-RF066",
    perfis: ["ADMINISTRADOR"],
    grupo: "administracao",
    icon: ShieldCheck,
  },
];

function pertence(perfisDoItem: NavItem["perfis"], perfisDoUsuario: Set<Perfil>): boolean {
  return perfisDoItem === "todos" || perfisDoItem.some((perfil) => perfisDoUsuario.has(perfil));
}

/** NAVEGACAO filtrada pelos perfis vigentes do usuário (RF003). */
export function itensVisiveis(perfisDoUsuario: Perfil[]): NavItem[] {
  const conjunto = new Set(perfisDoUsuario);
  return NAVEGACAO.filter((item) => pertence(item.perfis, conjunto));
}

/** Os itens visíveis agrupados na ordem de GRUPOS, sem grupos vazios. */
export function gruposVisiveis(perfisDoUsuario: Perfil[]) {
  const itens = itensVisiveis(perfisDoUsuario);
  return GRUPOS.map((grupo) => ({ ...grupo, itens: itens.filter((item) => item.grupo === grupo.chave) })).filter((grupo) => grupo.itens.length > 0);
}

/**
 * Item da rota atual: o href mais longo que é prefixo do caminho, para que a página de um
 * estudante (/administracao/estudantes/{id}) continue sob "Estudantes", e não sob "Administração".
 */
export function encontrarItem(pathname: string): NavItem | undefined {
  return NAVEGACAO.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
}
