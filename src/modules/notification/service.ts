import { notifyInputSchema, type NotifyInput } from "./schema";
import * as repo from "./repo";
import { publishToUser } from "./pubsub";

const PUBLISH_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("publish timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Stores the notification (source of truth) then pushes it to online recipients. Failures are
// logged and swallowed: a notification problem must never fail the business operation.
export async function notify(input: NotifyInput): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const data = notifyInputSchema.parse(input);
    const created = await repo.createNotifications(data);
    await Promise.allSettled(
      created.map((row) =>
        withTimeout(
          publishToUser(row.userId, {
            kind: "notification",
            item: {
              id: row.id,
              type: data.type,
              title: data.title,
              body: data.body ?? null,
              link: data.link ?? null,
              createdAt: row.createdAt,
              isRead: false,
            },
          }),
          PUBLISH_TIMEOUT_MS,
        ),
      ),
    );
  } catch (e) {
    console.error("notify failed", e);
  }
}

export function listForUser(...args: Parameters<typeof repo.listNotifications>) {
  return repo.listNotifications(...args);
}

export function unreadCountFor(userId: number) {
  return repo.unreadCount(userId);
}
