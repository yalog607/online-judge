import { describe, expect, it } from "vitest";
import { scoringSchema, validateTestcaseGroups } from "./schema";

describe("scoringSchema", () => {
  it("defaults to exact comparison without groups", () => {
    expect(scoringSchema.parse({})).toEqual({ compareMode: "exact", groups: [] });
  });

  it("rejects unknown modes, bad epsilon, negative points and duplicate groups", () => {
    expect(scoringSchema.safeParse({ compareMode: "regex" }).success).toBe(false);
    expect(scoringSchema.safeParse({ floatEpsilon: 0 }).success).toBe(false);
    expect(scoringSchema.safeParse({ groups: [{ groupNo: 1, points: -1 }] }).success).toBe(false);
    expect(
      scoringSchema.safeParse({
        groups: [
          { groupNo: 1, points: 10 },
          { groupNo: 1, points: 20 },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("validateTestcaseGroups", () => {
  const scoring = scoringSchema.parse({ groups: [{ groupNo: 1, points: 10 }] });
  it("accepts declared or missing groups and names the offending testcase", () => {
    expect(validateTestcaseGroups([{ groupNo: 1 }, {}], scoring)).toBeNull();
    expect(validateTestcaseGroups([{ groupNo: 1 }, { groupNo: 2 }], scoring)).toMatch(/#2/);
  });
});
