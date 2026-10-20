import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "./password";

describe("generateTemporaryPassword (RF002)", () => {
  it("meets the 15-character floor of NIST SP 800-63B-4", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(15);
  });

  it("uses only unambiguous characters", () => {
    for (let index = 0; index < 50; index++) {
      expect(generateTemporaryPassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
    }
  });

  it("does not repeat across issues", () => {
    const issued = new Set(Array.from({ length: 200 }, () => generateTemporaryPassword()));
    expect(issued.size).toBe(200);
  });

  it("round-trips through the configured hasher", async () => {
    const password = generateTemporaryPassword();
    const stored = await hashPassword(password);

    expect(await verifyPassword({ hash: stored, password })).toBe(true);
    expect(await verifyPassword({ hash: stored, password: `${password}x` })).toBe(false);
  });
});
