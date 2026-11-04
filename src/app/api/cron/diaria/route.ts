import { timingSafeEqual } from "node:crypto";
import { executarRotinaDiaria } from "@/db/rotinas";
import { errorResponse } from "@/lib/api";

// RF012, RF040, RF069: daily routine, called by the server timer (scripts/servidor/rotina-diaria.sh) with
// "Authorization: Bearer <CRON_SECRET>". Without a secret of at least 32 characters the route
// refuses everything, so an unconfigured environment never exposes it.

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET ?? "";
  if (segredo.length < 32) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function GET(request: Request): Promise<Response> {
  if (!autorizado(request)) return errorResponse(401, { code: "NAO_AUTENTICADO", message: "Rotina restrita ao agendador." });
  const resultado = await executarRotinaDiaria();
  return Response.json({ data: resultado }, { headers: { "Cache-Control": "no-store" } });
}
