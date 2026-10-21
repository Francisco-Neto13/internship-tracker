import { authenticatedRoute, dataResponse } from "@/lib/api";
import { listRelatoriosPendentes } from "@/modules/acompanhamento/services/relatorio-service";
import { relatorioJson } from "../../_acompanhamento/json";

// RF040: reports due or in analysis that the caller follows, earliest deadline first
export const GET = authenticatedRoute(async ({ identity }) => {
  return dataResponse((await listRelatoriosPendentes(identity)).map(relatorioJson));
});
