import { pgEnum } from "drizzle-orm/pg-core";

// Enums shared by several schema files. Kept in a module without imports, so the circular
// references between schema files (acesso, concedentes, documentos, estagios) never read an
// enum before it is initialized.

export const perfil = pgEnum("perfil", [
  "ESTUDANTE",
  "PROFESSOR_ORIENTADOR",
  "SUPERVISOR",
  "COORDENACAO",
  "CONCEDENTE",
  "ADMINISTRADOR",
]);

// M04, also used by M02 (periodicidade_relatorio): kept here for the same reason
export const tipoEstagio = pgEnum("tipo_estagio", ["OBRIGATORIO", "NAO_OBRIGATORIO"]);
