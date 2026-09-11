import { describe, expect, it } from "vitest";
import { isValidUserId } from "./identity";

describe("isValidUserId", () => {
  it("accepts a uuid", () => {
    expect(isValidUserId("5f1c7f3e-2b7a-4c1e-9d3a-1a2b3c4d5e6f")).toBe(true);
  });

  it.each(["", "admin", "' or 1=1 --", "5f1c7f3e-2b7a-4c1e-9d3a-1a2b3c4d5e6f; drop table estudante"])(
    "rejects %j",
    (value) => {
      expect(isValidUserId(value)).toBe(false);
    },
  );
});
