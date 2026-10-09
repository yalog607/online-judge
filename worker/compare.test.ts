import { describe, expect, it } from "vitest";
import { RESULT_MARKER, functionOutputsMatch, outputsMatch } from "./compare";

describe("outputsMatch", () => {
  it("ignores CRLF, trailing spaces and trailing blank lines", () => {
    expect(outputsMatch("1 \r\n2\r\n\r\n", "1\n2")).toBe(true);
  });
  it("detects different output", () => {
    expect(outputsMatch("1\n3", "1\n2")).toBe(false);
  });
});

describe("functionOutputsMatch", () => {
  const marker = RESULT_MARKER;

  it("only reads what follows the last marker and ignores user prints", () => {
    expect(functionOutputsMatch(`debug 1\n${marker}\n[0,1]\n`, "[0, 1]", "int[]")).toBe(true);
    expect(functionOutputsMatch(`${marker}\n[9]\n${marker}\n[0,1]\n`, "[0,1]", "int[]")).toBe(true);
  });

  it("fails without a marker or with invalid JSON", () => {
    expect(functionOutputsMatch("[0,1]", "[0,1]", "int[]")).toBe(false);
    expect(functionOutputsMatch(`${marker}\nnot json`, "[0,1]", "int[]")).toBe(false);
  });

  it("compares arrays, strings and booleans exactly", () => {
    expect(functionOutputsMatch(`${marker}\n[1,2]`, "[2,1]", "int[]")).toBe(false);
    expect(functionOutputsMatch(`${marker}\n"a b"`, '"a b"', "string")).toBe(true);
    expect(functionOutputsMatch(`${marker}\ntrue`, "false", "bool")).toBe(false);
    expect(functionOutputsMatch(`${marker}\n1.0000001`, "1", "int")).toBe(false);
  });

  it("allows a small tolerance for double results only", () => {
    expect(functionOutputsMatch(`${marker}\n0.30000000000000004`, "0.3", "double")).toBe(true);
    expect(functionOutputsMatch(`${marker}\n[[0.1],[0.2000000001]]`, "[[0.1],[0.2]]", "double[][]")).toBe(true);
    expect(functionOutputsMatch(`${marker}\n0.31`, "0.3", "double")).toBe(false);
  });
});
