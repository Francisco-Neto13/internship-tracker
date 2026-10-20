import { authenticatedRoute, dataResponse } from "@/lib/api";
import { cursoIdParamSchema, toCursoValues, updateCursoBodySchema } from "@/modules/academico/schemas/curso";
import { getCurso, updateCursoDados } from "@/modules/academico/services/curso-service";
import { cursoJson } from "../json";

// RF004: detail is readable by any authenticated user
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = cursoIdParamSchema.parse(params);
  return dataResponse(cursoJson(await getCurso(identity, id)));
});

// RF004: the administrator edits code, name and the workloads (hours in, minutes stored)
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = cursoIdParamSchema.parse(params);
  const body = updateCursoBodySchema.parse(await request.json());
  return dataResponse(cursoJson(await updateCursoDados(identity, id, toCursoValues(body))));
});
