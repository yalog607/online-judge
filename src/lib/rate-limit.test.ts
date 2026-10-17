import { beforeEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn();
const expire = vi.fn();
vi.mock("ioredis", () => ({
  default: class {
    incr = incr;
    expire = expire;
    on() {
      return this;
    }
  },
}));
vi.mock("@/lib/env", () => ({ env: () => ({ REDIS_URL: "redis://x" }) }));
vi.mock("@/db/exec", () => ({
  DomainError: class extends Error {
    constructor(
      readonly code: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { consume, enforceRateLimit, RATE_LIMIT_CODE } = await import("./rate-limit");

const rule = { scope: "t", key: "k", limit: 2, windowSeconds: 60 };

beforeEach(() => vi.clearAllMocks());

describe("consume", () => {
  it("sets the window on the first hit and allows up to the limit", async () => {
    incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    expect(await consume(rule)).toBe(true);
    expect(expire).toHaveBeenCalledWith("rl:t:k", 60);
    expect(await consume(rule)).toBe(true);
    expect(await consume(rule)).toBe(false);
    expect(expire).toHaveBeenCalledOnce();
  });

  it("fails open and logs when Redis errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    incr.mockRejectedValue(new Error("down"));
    expect(await consume(rule)).toBe(true);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("enforceRateLimit", () => {
  it("throws a DomainError with the friendly message when exceeded", async () => {
    incr.mockResolvedValue(99);
    await expect(enforceRateLimit([rule], "Chậm lại")).rejects.toMatchObject({
      code: RATE_LIMIT_CODE,
      message: "Chậm lại",
    });
  });

  it("passes when under the limit", async () => {
    incr.mockResolvedValue(1);
    await expect(enforceRateLimit([rule], "x")).resolves.toBeUndefined();
  });
});
