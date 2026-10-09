import { describe, expect, it } from "vitest";
import { functionSpecSchema } from "../function-spec";
import { buildFunctionFiles, starterCode, RESULT_MARKER } from "./index";

const spec = functionSpecSchema.parse({
  name: "twoSum",
  params: [
    { name: "nums", type: "int[]" },
    { name: "target", type: "int" },
  ],
  returns: "int[]",
});

const LANGS = ["cpp", "c", "java", "python", "javascript", "go", "csharp"];

describe("function harness", () => {
  it.each(LANGS)("%s: starter mentions the function and every parameter", (lang) => {
    const code = starterCode(lang, spec)!;
    expect(code).toContain("twoSum");
    expect(code).toContain("nums");
    expect(code).toContain("target");
  });

  it.each(LANGS)("%s: build keeps the student code and appends a driver", (lang) => {
    const files = buildFunctionFiles(lang, spec, "/*STUDENT*/")!;
    const all = Object.values(files).join("\n");
    expect(all).toContain("/*STUDENT*/");
    expect(all).toContain(RESULT_MARKER);
    expect(all).toContain("twoSum");
  });

  it("puts the Go driver in its own file", () => {
    const files = buildFunctionFiles("go", spec, "package main")!;
    expect(Object.keys(files).sort()).toEqual(["driver.go", "main.go"]);
  });

  it("returns null for unknown languages", () => {
    expect(buildFunctionFiles("ruby", spec, "x")).toBeNull();
    expect(starterCode("ruby", spec)).toBeNull();
  });
});
