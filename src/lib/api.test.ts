import { describe, expect, it } from "vitest";
import { z } from "zod";
import { corpoOpcional, toErrorResponse } from "./api";
import { DomainError } from "./errors";

async function bodyOf(response: Response) {
  return (await response.json()) as { error: { code: string; requisito?: string } };
}

describe("error translation at the API boundary", () => {
  it.each([
    ["CONFLICT", 409],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["UNPROCESSABLE", 422],
  ] as const)("maps a %s domain error to %i with its stable code", async (kind, status) => {
    const response = toErrorResponse(
      new DomainError({ code: "CONVENIO_VENCIDO", kind, message: "x", requisito: "RF010" }),
    );

    expect(response.status).toBe(status);
    expect(await bodyOf(response)).toMatchObject({ error: { code: "CONVENIO_VENCIDO", requisito: "RF010" } });
  });

  it("maps schema validation failures to 400", async () => {
    const result = z.object({ periodo: z.number() }).safeParse({ periodo: "x" });
    const response = toErrorResponse(result.error);

    expect(response.status).toBe(400);
    expect((await bodyOf(response)).error.code).toBe("PAYLOAD_INVALIDO");
  });

  it("maps a malformed JSON body to 400", () => {
    expect(toErrorResponse(new SyntaxError("Unexpected token")).status).toBe(400);
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const response = toErrorResponse(new Error("connection string with password"));
      const body = await bodyOf(response);

      expect(response.status).toBe(500);
      expect(JSON.stringify(body)).not.toContain("password");
    } finally {
      console.error = original;
    }
  });
});

// RF038: the approval opinion is optional, and the action button sends no body when there is none
describe("optional request body", () => {
  const post = (body?: string) => new Request("http://localhost/api", { method: "POST", body });

  it("reads an empty body as an empty object", async () => {
    expect(await corpoOpcional(post())).toEqual({});
    expect(await corpoOpcional(post("  "))).toEqual({});
  });

  it("reads a JSON body as usual", async () => {
    expect(await corpoOpcional(post(JSON.stringify({ parecer: "Bom trabalho" })))).toEqual({ parecer: "Bom trabalho" });
  });

  it("still refuses malformed JSON", async () => {
    await expect(corpoOpcional(post("{parecer"))).rejects.toBeInstanceOf(SyntaxError);
  });
});
