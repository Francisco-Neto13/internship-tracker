import type { NextResponse } from "next/server";
import { COOKIE_CONTEXTO } from "@/lib/session";

// RF003: the cookie only spares other sessions the lookup; the switch is the database row
export function marcarContexto(resposta: NextResponse) {
  resposta.cookies.set(COOKIE_CONTEXTO, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return resposta;
}

export function limparContexto(resposta: NextResponse) {
  resposta.cookies.delete(COOKIE_CONTEXTO);
  return resposta;
}
