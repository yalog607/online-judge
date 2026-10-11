import { aggregateInputSchema, notifyInputSchema, type AggregateInput, type NotifyInput } from "./schema";
import * as repo from "./repo";
import { publishToUser } from "./pubsub";

const PUBLISH_TIMEOUT_MS = 1500;
const MAX_RECIPIENTS = 500;

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
  // The schema caps one batch; larger audiences (a whole class) are sent in chunks.
  const unique = [...new Set(input.userIds)];
  for (let i = 0; i < unique.length; i += MAX_RECIPIENTS) {
    await notifyBatch({ ...input, userIds: unique.slice(i, i + MAX_RECIPIENTS) });
  }
}

async function notifyBatch(input: NotifyInput): Promise<void> {
  try {
    const data = notifyInputSchema.parse(input);
    const created = await repo.createNotifications(data);
    const results = await Promise.allSettled(
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
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) console.error(`notify: ${failed} realtime publish(es) failed`);
  } catch (e) {
    console.error("notify failed", e);
  }
}

// Folds repeated events into one running notification (see usp_Notification_Aggregate). Like
// notify(), it never throws: a notification problem must not fail the business operation.
export async function notifyAggregate(input: AggregateInput): Promise<void> {
  try {
    const data = aggregateInputSchema.parse(input);
    const row = await repo.aggregateNotification(data);
    if (!row) return;
    await withTimeout(
      publishToUser(row.userId, {
        kind: "notification",
        updated: row.updated,
        item: {
          id: row.id,
          type: data.type,
          title: row.title,
          body: data.body ?? null,
          link: data.link,
          createdAt: row.createdAt,
          isRead: false,
        },
      }),
      PUBLISH_TIMEOUT_MS,
    ).catch((e) => console.error("notifyAggregate: realtime publish failed", e));
  } catch (e) {
    console.error("notifyAggregate failed", e);
  }
}

export function listForUser(...args: Parameters<typeof repo.listNotifications>) {
  return repo.listNotifications(...args);
}

export function unreadCountFor(userId: number) {
  return repo.unreadCount(userId);
}
