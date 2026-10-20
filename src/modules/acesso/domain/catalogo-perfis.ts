import { ROTULO_PERFIL, type Perfil } from "../schemas/perfil";

// What each profile reaches (RF003, RN-37). Access is the intersection of profile and
// link, enforced by RLS; this catalog only describes it, for the interface and for
// GET /api/v1/perfis. Keep it in step with the "Perfil | Alcance" table in AGENTS.md.

type EntradaCatalogo = {
  perfil: Perfil;
  rotulo: string;
  alcance: string;
  exigeCurso: boolean;
  /** False while the profile depends on a table that does not exist yet (Fase 2). */
  disponivel: boolean;
};

const ALCANCE: Record<Perfil, string> = {
  ESTUDANTE: "Apenas os próprios registros",
  PROFESSOR_ORIENTADOR: "Estágios em que consta como orientador vigente",
  SUPERVISOR: "Estágios em que consta como supervisor vigente",
  COORDENACAO: "Estudantes e estágios do curso sob sua coordenação",
  CONCEDENTE: "Estágios da própria concedente",
  ADMINISTRADOR: "Parametrização, usuários e auditoria; sem acesso a conteúdo de relatório ou atestado",
};

const AGUARDAM_CONCEDENTE: readonly Perfil[] = ["SUPERVISOR", "CONCEDENTE"];

export function catalogoPerfis(): EntradaCatalogo[] {
  return (Object.keys(ROTULO_PERFIL) as Perfil[]).map((perfil) => ({
    perfil,
    rotulo: ROTULO_PERFIL[perfil],
    alcance: ALCANCE[perfil],
    exigeCurso: perfil === "COORDENACAO",
    disponivel: !AGUARDAM_CONCEDENTE.includes(perfil),
  }));
}
