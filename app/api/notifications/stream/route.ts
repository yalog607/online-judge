import { verifySession } from "@/lib/dal";
import { unreadCountFor } from "@/modules/notification/service";
import { subscribeToUser } from "@/modules/notification/pubsub";
import type { StreamMessage } from "@/modules/notification/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-sent events: pushes this user's new notifications as soon as they are published.
export async function GET(request: Request) {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (message: StreamMessage) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {}
      };

      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);
      let unsubscribe = () => {};
      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
      request.signal.addEventListener("abort", close);

      try {
        // Subscribe first, then read the count, so a notification landing in between is not missed.
        unsubscribe = await subscribeToUser(user.userId, send);
        send({ kind: "ready", unread: await unreadCountFor(user.userId) });
      } catch (e) {
        console.error("notification stream failed", e);
        close();
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
