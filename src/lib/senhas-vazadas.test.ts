import { describe, expect, it } from "vitest";
import { contagemNoRange } from "./senhas-vazadas";

describe("contagemNoRange (HIBP range response)", () => {
  const resposta = ["0018A45C4D1DEF81644B54AB7F969B88D65:0", "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493", ""].join("\r\n");

  it("returns the count of the matching suffix, case-insensitively", () => {
    expect(contagemNoRange(resposta, "1e4c9b93f3f0682250b6cf8331b7ee68fd8")).toBe(3861493);
  });

  it("treats padding entries and absent suffixes as not breached", () => {
    expect(contagemNoRange(resposta, "0018A45C4D1DEF81644B54AB7F969B88D65")).toBe(0);
    expect(contagemNoRange(resposta, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toBe(0);
  });

  it("rejects a malformed count instead of guessing", () => {
    expect(() => contagemNoRange("ABC:muitos", "ABC")).toThrow();
  });
});
