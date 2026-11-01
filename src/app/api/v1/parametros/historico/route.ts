import { authenticatedRoute, dataResponse } from "@/lib/api";
import { listHistoricoParametros } from "@/modules/academico/services/parametro-service";
import { parametrosJson } from "../json";

// RF006: every version, newest first (validations of the past used the version of their date)
export const GET = authenticatedRoute(async ({ identity }) => {
  return dataResponse((await listHistoricoParametros(identity)).map(parametrosJson));
});
