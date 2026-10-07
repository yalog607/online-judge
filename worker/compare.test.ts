import { describe, expect, it } from "vitest";
import { outputsMatch } from "./compare";

describe("outputsMatch", () => {
  it("ignores CRLF, trailing spaces and trailing blank lines", () => {
    expect(outputsMatch("1 \r\n2\r\n\r\n", "1\n2")).toBe(true);
  });
  it("detects different output", () => {
    expect(outputsMatch("1\n3", "1\n2")).toBe(false);
  });
});
