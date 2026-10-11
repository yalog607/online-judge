import { describe, expect, it } from "vitest";
import { isSafeLink, notifyInputSchema } from "./schema";

const base = { userIds: [1], type: "judge_result", title: "Kết quả" } as const;

describe("isSafeLink", () => {
  it.each(["/submissions/1", "/user/problems/5?tab=a"])("accepts %s", (l) => {
    expect(isSafeLink(l)).toBe(true);
  });
  it.each(["https://evil.com", "//evil.com", "javascript:alert(1)", "relative", "/a\\b", "/<x>"])(
    "rejects %s",
    (l) => expect(isSafeLink(l)).toBe(false),
  );
});

describe("notifyInputSchema", () => {
  it("accepts a minimal input", () => {
    expect(notifyInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects empty or oversized recipient lists", () => {
    expect(notifyInputSchema.safeParse({ ...base, userIds: [] }).success).toBe(false);
    expect(
      notifyInputSchema.safeParse({ ...base, userIds: Array.from({ length: 501 }, (_, i) => i + 1) }).success,
    ).toBe(false);
  });
  it("rejects unknown type, long title and unsafe link", () => {
    expect(notifyInputSchema.safeParse({ ...base, type: "nope" }).success).toBe(false);
    expect(notifyInputSchema.safeParse({ ...base, title: "x".repeat(201) }).success).toBe(false);
    expect(notifyInputSchema.safeParse({ ...base, link: "https://evil.com" }).success).toBe(false);
  });
  it("dedupes recipient ids", () => {
    const r = notifyInputSchema.parse({ ...base, userIds: [2, 2, 3] });
    expect(r.userIds).toEqual([2, 3]);
  });
});
