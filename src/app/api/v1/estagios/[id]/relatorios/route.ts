import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { relatorioJson } from "../../../_acompanhamento/json";

// RF037, RF040, RF041: reports the internship owes, generated on activation, with deadlines
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listRelatorios(identity, id)).map(relatorioJson));
});
