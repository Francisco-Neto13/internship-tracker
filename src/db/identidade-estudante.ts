import { sql } from "drizzle-orm";
import { estagio } from "./schema";

// Issue #80: who follows an internship reads the student's name and enrolment, and nothing else of
// the row. Orientador, supervisor and concedente have no policy on usuario or estudante: those would
// also open e-mail, academic situation and period. The function hands over only these two columns.
const juncao = sql`app.identidades_estudante() as identidade`;
const correspondencia = sql`identidade.estudante_id = ${estagio.estudanteId}`;

export const identidadeEstudante = {
  juncao,
  correspondencia,
  nome: sql<string | null>`identidade.nome`,
  matricula: sql<string | null>`identidade.matricula`,
};
