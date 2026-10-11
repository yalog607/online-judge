import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifyInput } from "./schema";

const createNotifications = vi.fn();
const aggregateNotification = vi.fn();
const publishToUser = vi.fn();
vi.mock("./repo", () => ({ createNotifications, aggregateNotification }));
vi.mock("./pubsub", () => ({ publishToUser }));

const { notify, notifyAggregate } = await import("./service");

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

  it("sends more than 500 recipients in chunks instead of dropping them", async () => {
    createNotifications.mockResolvedValue([]);
    const userIds = Array.from({ length: 1200 }, (_, i) => i + 1);
    await notify({ ...input, userIds });
    expect(createNotifications).toHaveBeenCalledTimes(3);
    const sent = createNotifications.mock.calls.flatMap((c) => c[0].userIds);
    expect(sent).toHaveLength(1200);
  });
});

describe("notifyAggregate", () => {
  const agg = {
    userId: 7,
    type: "contest_joined",
    titleTemplate: "{n} người đã tham gia",
    body: "Mới nhất: An",
    link: "/teacher/contests/1",
  } as const;

  it("publishes the merged row and marks a repeat as an update", async () => {
    aggregateNotification.mockResolvedValue({
      id: 5,
      userId: 7,
      createdAt: "2026-01-01T00:00:00.000Z",
      title: "3 người đã tham gia",
      updated: true,
    });
    publishToUser.mockResolvedValue(undefined);
    await notifyAggregate(agg);
    expect(publishToUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        kind: "notification",
        updated: true,
        item: expect.objectContaining({ id: 5, title: "3 người đã tham gia", isRead: false }),
      }),
    );
  });

  it("does nothing when the recipient does not exist", async () => {
    aggregateNotification.mockResolvedValue(null);
    await notifyAggregate(agg);
    expect(publishToUser).not.toHaveBeenCalled();
  });

  it("never throws when the database fails", async () => {
    aggregateNotification.mockRejectedValue(new Error("db down"));
    await expect(notifyAggregate(agg)).resolves.toBeUndefined();
  });
});
