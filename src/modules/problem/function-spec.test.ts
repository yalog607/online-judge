import { describe, expect, it } from "vitest";
import { functionSpecSchema, parseFunctionSpec, validateFunctionTestcase } from "./function-spec";

const spec = functionSpecSchema.parse({
  name: "twoSum",
  params: [
    { name: "nums", type: "int[]" },
    { name: "target", type: "int" },
  ],
  returns: "int[]",
});

describe("functionSpecSchema", () => {
  it("accepts a valid signature", () => {
    expect(spec.name).toBe("twoSum");
  });

  it.each([
    [{ name: "1bad", params: [{ name: "a", type: "int" }], returns: "int" }],
    [{ name: "f", params: [], returns: "int" }],
    [{ name: "f", params: [{ name: "a", type: "float" }], returns: "int" }],
    [{ name: "f", params: [{ name: "a", type: "int" }], returns: "int[][][]" }],
    [
      {
        name: "f",
        params: [
          { name: "a", type: "int" },
          { name: "a", type: "int" },
        ],
        returns: "int",
      },
    ],
  ])("rejects invalid signature %#", (raw) => {
    expect(functionSpecSchema.safeParse(raw).success).toBe(false);
  });

  it("parseFunctionSpec tolerates garbage", () => {
    expect(parseFunctionSpec("not json")).toBeNull();
    expect(parseFunctionSpec(null)).toBeNull();
    expect(parseFunctionSpec(JSON.stringify(spec))).toEqual(spec);
  });
});

describe("validateFunctionTestcase", () => {
  it("accepts matching testcases (CRLF and trailing newline included)", () => {
    expect(validateFunctionTestcase(spec, "[2,7,11,15]\r\n9\r\n", "[0,1]")).toBeNull();
  });

  it("reports wrong line count", () => {
    expect(validateFunctionTestcase(spec, "[2,7]", "[0,1]")).toMatch(/2 dòng/);
  });

  it("reports wrong types and invalid JSON", () => {
    expect(validateFunctionTestcase(spec, "[2,\"x\"]\n9", "[0,1]")).toMatch(/nums/);
    expect(validateFunctionTestcase(spec, "[2,7]\n9.5", "[0,1]")).toMatch(/target/);
    expect(validateFunctionTestcase(spec, "[2,7]\nabc", "[0,1]")).toMatch(/JSON/);
    expect(validateFunctionTestcase(spec, "[2,7]\n9", "oops")).toMatch(/Output/);
    expect(validateFunctionTestcase(spec, "[2,7]\n9", "1")).toMatch(/int\[\]/);
  });

  it("checks int range, bool, string and 2D arrays", () => {
    const s = functionSpecSchema.parse({
      name: "f",
      params: [
        { name: "a", type: "int" },
        { name: "b", type: "bool" },
        { name: "c", type: "string" },
        { name: "d", type: "int[][]" },
      ],
      returns: "double",
    });
    expect(validateFunctionTestcase(s, '1\ntrue\n"hi"\n[[1],[2,3]]', "0.5")).toBeNull();
    expect(validateFunctionTestcase(s, '3000000000\ntrue\n"hi"\n[[1]]', "0.5")).toMatch(/int/);
    expect(validateFunctionTestcase(s, '1\n1\n"hi"\n[[1]]', "0.5")).toMatch(/bool/);
    expect(validateFunctionTestcase(s, '1\ntrue\n"hi"\n[1]', "0.5")).toMatch(/int\[\]\[\]/);
  });
});
