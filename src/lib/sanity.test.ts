import { describe, expect, it } from "vitest";

describe("sanity", () => {
  it("runs in CI", () => {
    expect(1 + 1).toBe(2);
  });
});
