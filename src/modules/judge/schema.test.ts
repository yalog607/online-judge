import { describe, expect, it } from "vitest";
import { judgeJobSchema } from "./schema";

describe("judgeJobSchema", () => {
  it("accepts a positive integer submission id only", () => {
    expect(judgeJobSchema.parse({ submissionId: 5 })).toEqual({ submissionId: 5 });
    expect(() => judgeJobSchema.parse({ submissionId: 0 })).toThrow();
    expect(() => judgeJobSchema.parse({ submissionId: "5" })).toThrow();
  });
});
