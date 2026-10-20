import { describe, expect, it } from "vitest";
import { padraoContendo } from "./like";

describe("padraoContendo", () => {
  it("wraps the text for a substring match", () => {
    expect(padraoContendo("ana")).toBe("%ana%");
  });

  it("escapes LIKE wildcards and the escape character", () => {
    expect(padraoContendo("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });
});
