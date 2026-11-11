import { NextResponse } from "next/server";
import { z } from "zod";
import { isReadOnlyTransaction, isTriggerRule } from "@/db/errors";
import { DomainError, type DomainErrorDetail, type DomainErrorKind } from "./errors";
import type { Identity } from "./identity";
import { getSession } from "./session";

// HTTP boundary for /api/v1: authenticate, validate, translate errors into the
// { error: { code, message, requisito, details } } envelope. Business rules never live here.

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE: 422,
  UNAVAILABLE: 503,
};

type ErrorBody = {
  code: string;
  message: string;
  requisito?: string;
  details?: DomainErrorDetail[];
};

type RouteContext<TParams> = { params: Promise<TParams> };

type AuthenticatedRequest<TParams> = {
  request: Request;
  identity: Identity;
  params: TParams;
  sessaoId: string;
};

export function errorResponse(status: number, body: ErrorBody) {
  return NextResponse.json({ error: body }, { status });
}

export function dataResponse<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown>; headers?: HeadersInit },
) {
  return NextResponse.json(init?.meta ? { data, meta: init.meta } : { data }, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}

/** For responses carrying a secret shown once, such as a temporary password (OWASP ASVS V8.2). */
export const SEM_CACHE = { "Cache-Control": "no-store" } as const;

/**
 * Body of a route whose fields are all optional: an empty body reads as {}, because the action
 * button sends none when there is nothing to say (RF038, approval without opinion). Malformed
 * JSON still throws the SyntaxError that becomes 400.
 */
export async function corpoOpcional(request: Request): Promise<unknown> {
  const texto = await request.text();
  return texto.trim() === "" ? {} : JSON.parse(texto);
}

type RouteOptions = {
  /** RF002: reachable while a temporary password is still in use (change password, session). */
  permitirTrocaSenhaPendente?: boolean;
  /**
   * RF003: the route acts as the person signed in, even while they view the system as another
   * account (open, change or end the switch). Every other route sees the account being viewed.
   */
  comoTitular?: boolean;
};

const LEITURA = new Set(["GET", "HEAD", "OPTIONS"]);

const SOMENTE_LEITURA: ErrorBody = {
  code: "CONTEXTO_SOMENTE_LEITURA",
  message: "Você está vendo o sistema como outra pessoa, e nada é alterado nesse modo. Volte ao seu perfil para fazer essa ação.",
  requisito: "RF003",
};

export function authenticatedRoute<TParams = Record<string, never>>(
  handler: (context: AuthenticatedRequest<TParams>) => Promise<Response>,
  options: RouteOptions = {},
) {
  return async (request: Request, context: RouteContext<TParams>): Promise<Response> => {
    try {
      const session = await getSession();
      if (!session) {
        return errorResponse(401, { code: "NAO_AUTENTICADO", message: "Sessão ausente ou expirada.", requisito: "RF002" });
      }
      if (session.user.trocaSenhaObrigatoria && !options.permitirTrocaSenhaPendente) {
        return errorResponse(403, {
          code: "TROCA_SENHA_OBRIGATORIA",
          message: "Defina uma nova senha antes de continuar.",
          requisito: "RF002",
        });
      }
      if (options.comoTitular) {
        return await handler({ request, identity: session.titular, params: await context.params, sessaoId: session.sessaoId });
      }
      if (session.contexto && !LEITURA.has(request.method)) return errorResponse(403, SOMENTE_LEITURA);
      return await handler({ request, identity: session.identity, params: await context.params, sessaoId: session.sessaoId });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): Response {
  // request.json() on a malformed body
  if (error instanceof SyntaxError) {
    return errorResponse(400, { code: "PAYLOAD_INVALIDO", message: "O corpo da requisição não é JSON válido." });
  }

  if (error instanceof z.ZodError) {
    return errorResponse(400, {
      code: "PAYLOAD_INVALIDO",
      message: "O payload não atende ao formato esperado.",
      details: error.issues.map((issue) => ({ field: issue.path.join("."), issue: issue.message })),
    });
  }

  // A read that writes its own trail (sensitive document) inside a switch: read only (RF003)
  if (isReadOnlyTransaction(error)) return errorResponse(403, SOMENTE_LEITURA);
  if (isTriggerRule(error, "CONTEXTO_SEM_DOCUMENTO")) {
    return errorResponse(403, {
      code: "CONTEXTO_SEM_DOCUMENTO",
      message: "Documentos não abrem enquanto você vê o sistema como outra pessoa.",
      requisito: "RF003",
    });
  }

  if (error instanceof DomainError) {
    return errorResponse(STATUS_BY_KIND[error.kind], {
      code: error.code,
      message: error.message,
      requisito: error.requisito,
      details: error.details,
    });
  }

  console.error(error);
  return errorResponse(500, { code: "ERRO_INTERNO", message: "Erro interno." });
}

export function searchParamsOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}
