import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifyInput } from "./schema";

const createNotifications = vi.fn();
const publishToUser = vi.fn();
vi.mock("./repo", () => ({ createNotifications }));
vi.mock("./pubsub", () => ({ publishToUser }));

const { notify } = await import("./service");

const input: NotifyInput = { userIds: [1, 2], type: "judge_result", title: "T", link: "/submissions/1" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notify", () => {
  it("stores then publishes one message per created row", async () => {
    createNotifications.mockResolvedValue([
      { id: 10, userId: 1, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: 11, userId: 2, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    publishToUser.mockResolvedValue(undefined);
    await notify(input);
    expect(createNotifications).toHaveBeenCalledOnce();
    expect(publishToUser).toHaveBeenCalledTimes(2);
    expect(publishToUser.mock.calls[0][1]).toMatchObject({
      kind: "notification",
      item: { id: 10, type: "judge_result", title: "T", link: "/submissions/1", isRead: false },
    });
  });

  it("does nothing for an empty recipient list", async () => {
    await notify({ ...input, userIds: [] });
    expect(createNotifications).not.toHaveBeenCalled();
  });

  it("never throws when the database fails", async () => {
    createNotifications.mockRejectedValue(new Error("db down"));
    await expect(notify(input)).resolves.toBeUndefined();
    expect(publishToUser).not.toHaveBeenCalled();
  });

  it("never throws and stays fast when publish fails or hangs", async () => {
    createNotifications.mockResolvedValue([{ id: 1, userId: 1, createdAt: "x" }]);
    publishToUser.mockImplementation(() => new Promise(() => {})); // never settles
    const started = Date.now();
    await expect(notify(input)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("rejects an invalid link without touching the database", async () => {
    await notify({ ...input, link: "https://evil.com" });
    expect(createNotifications).not.toHaveBeenCalled();
  });
});
