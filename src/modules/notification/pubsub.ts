import IORedis from "ioredis";
import { env } from "@/lib/env";
import type { StreamMessage } from "./types";

export const notifChannel = (userId: number) => `notif:user:${userId}`;

const g = globalThis as typeof globalThis & { __itojNotifPublisher?: IORedis };

// Commands queue until the connection is ready (first publish after start-up); service.ts bounds
// the wait with a timeout, so a Redis outage never stalls a request for long.
function publisher() {
  if (!g.__itojNotifPublisher) {
    const client = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    client.on("error", () => {});
    g.__itojNotifPublisher = client;
  }
  return g.__itojNotifPublisher;
}

export async function publishToUser(userId: number, message: StreamMessage): Promise<void> {
  await publisher().publish(notifChannel(userId), JSON.stringify(message));
}

// One dedicated connection per SSE client; the returned function releases it.
export async function subscribeToUser(
  userId: number,
  onMessage: (message: StreamMessage) => void,
): Promise<() => void> {
  const sub = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
  sub.on("error", () => {});
  const channel = notifChannel(userId);
  sub.on("message", (ch, raw) => {
    if (ch !== channel) return;
    try {
      onMessage(JSON.parse(raw) as StreamMessage);
    } catch {
      /* ignore malformed payloads */
    }
  });
  await sub.subscribe(channel);
  return () => {
    sub.disconnect();
  };
}
