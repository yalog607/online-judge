import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

// Local-time constructors keep the day boundaries independent of the machine's timezone.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const now = at(2026, 10, 11, 14, 0);

describe("formatRelativeTime", () => {
  it("says just now under a minute", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 20_000).toISOString(), now)).toBe("Vừa xong");
  });

  it("uses minutes under an hour", () => {
    expect(formatRelativeTime(at(2026, 10, 11, 13, 50).toISOString(), now)).toBe("10 phút trước");
  });

  it("uses hours within the last six hours", () => {
    expect(formatRelativeTime(at(2026, 10, 11, 13, 0).toISOString(), now)).toBe("1 giờ trước");
    expect(formatRelativeTime(at(2026, 10, 11, 9, 0).toISOString(), now)).toBe("5 giờ trước");
  });

  it("uses 'Hôm nay' for earlier today and 'Hôm qua' for yesterday", () => {
    expect(formatRelativeTime(at(2026, 10, 11, 0, 5).toISOString(), at(2026, 10, 11, 23, 0))).toBe("Hôm nay");
    expect(formatRelativeTime(at(2026, 10, 10, 23, 50).toISOString(), now)).toBe("Hôm qua");
  });

  it("falls back to a date for older items", () => {
    expect(formatRelativeTime(at(2026, 10, 3, 9, 0).toISOString(), now)).toBe("03/10/2026");
  });

  it("never shows a negative duration for slightly-future timestamps", () => {
    expect(formatRelativeTime(new Date(now.getTime() + 5_000).toISOString(), now)).toBe("Vừa xong");
  });
});
