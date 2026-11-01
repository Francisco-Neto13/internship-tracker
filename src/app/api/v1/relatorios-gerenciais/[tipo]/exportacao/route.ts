import { authenticatedRoute, searchParamsOf } from "@/lib/api";
import { exportacaoQuerySchema, tipoRelatorioParamSchema } from "@/modules/administracao/schemas/relatorios-gerenciais";
import { exportarRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";

// RF068: the report as a CSV (UTF-8 with BOM, ";") or a PDF download, same rows as on screen
export const GET = authenticatedRoute<{ tipo: string }>(async ({ request, identity, params }) => {
  const { tipo } = tipoRelatorioParamSchema.parse(params);
  const { formato, filtro } = exportacaoQuerySchema.parse(searchParamsOf(request));
  const conteudo = await exportarRelatorio(identity, tipo, filtro, formato);
  const carimbo = new Date().toISOString().slice(0, 10);
  return new Response(typeof conteudo === "string" ? conteudo : Buffer.from(conteudo), {
    headers: {
      "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/pdf",
      "Content-Disposition": `attachment; filename="${tipo}-${carimbo}.${formato}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
