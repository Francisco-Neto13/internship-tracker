import { perfil } from "@/db/schema";

// Single source of truth for the profile union: derived from the enum the migration
// created, so a new value added to the schema shows up here without duplication.
export type Perfil = (typeof perfil.enumValues)[number];

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ESTUDANTE: "Estudante",
  PROFESSOR_ORIENTADOR: "Professor orientador",
  SUPERVISOR: "Supervisor",
  COORDENACAO: "Coordenação",
  CONCEDENTE: "Concedente",
  ADMINISTRADOR: "Administrador",
};
