import { NextResponse } from "next/server";
import { z } from "zod";
import { DomainError, type DomainErrorDetail, type DomainErrorKind } from "./errors";
import type { Identity } from "./identity";
import { getIdentity } from "./session";

// HTTP boundary for /api/v1: authenticate, validate, translate errors into the
// { error: { code, message, requisito, details } } envelope. Business rules never live here.

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE: 422,
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
};

export function errorResponse(status: number, body: ErrorBody) {
  return NextResponse.json({ error: body }, { status });
}

export function dataResponse<T>(data: T, init?: { status?: number; meta?: Record<string, unknown> }) {
  return NextResponse.json(init?.meta ? { data, meta: init.meta } : { data }, { status: init?.status ?? 200 });
}

export function authenticatedRoute<TParams = Record<string, never>>(
  handler: (context: AuthenticatedRequest<TParams>) => Promise<Response>,
) {
  return async (request: Request, context: RouteContext<TParams>): Promise<Response> => {
    try {
      const identity = await getIdentity();
      if (!identity) {
        return errorResponse(401, { code: "NAO_AUTENTICADO", message: "Sessao ausente ou expirada.", requisito: "RF002" });
      }
      return await handler({ request, identity, params: await context.params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): Response {
  // request.json() on a malformed body
  if (error instanceof SyntaxError) {
    return errorResponse(400, { code: "PAYLOAD_INVALIDO", message: "O corpo da requisicao nao e JSON valido." });
  }

  if (error instanceof z.ZodError) {
    return errorResponse(400, {
      code: "PAYLOAD_INVALIDO",
      message: "O payload nao atende ao formato esperado.",
      details: error.issues.map((issue) => ({ field: issue.path.join("."), issue: issue.message })),
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
