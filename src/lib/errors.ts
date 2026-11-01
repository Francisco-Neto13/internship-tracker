// Business errors carry a stable code the interface can branch on without parsing text.
// The kind stays HTTP-agnostic; src/lib/api.ts maps it to a status code.

/** UNAVAILABLE: a dependency the rule needs is down, and the safe answer is to refuse for now. */
export type DomainErrorKind = "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "UNPROCESSABLE" | "UNAVAILABLE";

export type DomainErrorDetail = {
  code?: string;
  field?: string;
  issue?: string;
  requisito?: string;
};

export class DomainError extends Error {
  readonly code: string;
  readonly kind: DomainErrorKind;
  readonly requisito?: string;
  readonly details?: DomainErrorDetail[];

  constructor(options: {
    code: string;
    kind: DomainErrorKind;
    message: string;
    requisito?: string;
    details?: DomainErrorDetail[];
  }) {
    super(options.message);
    this.name = "DomainError";
    this.code = options.code;
    this.kind = options.kind;
    this.requisito = options.requisito;
    this.details = options.details;
  }
}
