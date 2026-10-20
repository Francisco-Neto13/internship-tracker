import { authenticatedRoute, searchParamsOf } from "@/lib/api";
import { exportAuditoriaQuerySchema, toFiltroAuditoria } from "@/modules/administracao/schemas/auditoria";
import { exportarRegistros } from "@/modules/administracao/services/auditoria-service";

// RF066: the filtered trail as a CSV download (format in src/lib/csv.ts)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = exportAuditoriaQuerySchema.parse(searchParamsOf(request));
  const csv = await exportarRegistros(identity, toFiltroAuditoria(query));
  const carimbo = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${carimbo}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
