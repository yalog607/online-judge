import { beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribe = vi.fn();
let resolveSubscribe: (fn: () => void) => void = () => {};
vi.mock("@/lib/dal", () => ({ verifySession: async () => ({ userId: 1 }) }));
vi.mock("@/modules/notification/service", () => ({ unreadCountFor: async () => 0 }));
vi.mock("@/modules/notification/pubsub", () => ({
  subscribeToUser: () => new Promise<() => void>((res) => (resolveSubscribe = res)),
}));

const { GET } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/notifications/stream", () => {
  it("releases the subscriber when the client leaves before the subscription is ready", async () => {
    const ac = new AbortController();
    await GET(new Request("http://x/api/notifications/stream", { signal: ac.signal }));
    ac.abort();
    resolveSubscribe(unsubscribe);
    await new Promise((r) => setTimeout(r, 20));
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
