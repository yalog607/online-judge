import { describe, expect, it } from "vitest";
import { submitCodeSchema } from "./schema";
import { MAX_SOURCE_BYTES } from "@/modules/submission/limits";

const base = { problemId: "1", language: "cpp" };

describe("submitCodeSchema source size", () => {
  it("accepts source up to the byte limit", () => {
    expect(submitCodeSchema.safeParse({ ...base, sourceCode: "a".repeat(MAX_SOURCE_BYTES) }).success).toBe(true);
  });

  it("rejects source over the limit", () => {
    const r = submitCodeSchema.safeParse({ ...base, sourceCode: "a".repeat(MAX_SOURCE_BYTES + 1) });
    expect(r.success).toBe(false);
  });

  it("counts UTF-8 bytes, not characters", () => {
    const r = submitCodeSchema.safeParse({ ...base, sourceCode: "ệ".repeat(MAX_SOURCE_BYTES / 2) });
    expect(r.success).toBe(false);
  });
});
