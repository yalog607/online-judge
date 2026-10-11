import { beforeEach, describe, expect, it, vi } from "vitest";

const disconnect = vi.fn();
const subscribe = vi.fn();
vi.mock("ioredis", () => ({
  default: class {
    on() {}
    subscribe = subscribe;
    disconnect = disconnect;
  },
}));
vi.mock("@/lib/env", () => ({ env: () => ({ REDIS_URL: "redis://x" }) }));

const { subscribeToUser } = await import("./pubsub");

beforeEach(() => vi.clearAllMocks());

describe("subscribeToUser", () => {
  it("releases the connection when subscribing fails", async () => {
    subscribe.mockRejectedValue(new Error("redis down"));
    await expect(subscribeToUser(1, () => {})).rejects.toThrow("redis down");
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
