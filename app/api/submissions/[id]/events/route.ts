import { verifySession } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import { getSubmission } from "@/modules/submission/repo";
import { judgeQueueEvents } from "@/modules/judge/queue";
import { judgeJobId } from "@/modules/judge/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["AC", "WA", "TLE", "MLE", "RE", "CE", "IE"]);

// Server-sent events: pushes status changes of one submission as soon as the judge queue
// reports them. Only statuses are sent; details are read through getSubmission.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const submissionId = Number((await params).id);
  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const current = async () => {
    try {
      return (await getSubmission(submissionId, user.userId)).detail?.Result ?? null;
    } catch (e) {
      if (e instanceof DomainError) return null;
      throw e;
    }
  };
  if ((await current()) === null) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const events = judgeQueueEvents();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: object) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {}
      };
      const finishWith = async () => {
        const status = await current();
        send({ status, done: status === null || TERMINAL.has(status) });
        if (status === null || TERMINAL.has(status)) close();
      };

      const onActive = ({ jobId }: { jobId: string }) => {
        if (jobId === judgeJobId(submissionId)) send({ status: "Judging", done: false });
      };
      const onDone = ({ jobId }: { jobId: string }) => {
        if (jobId === judgeJobId(submissionId)) void finishWith();
      };
      events.on("active", onActive);
      events.on("completed", onDone);
      events.on("failed", onDone);
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      cleanup = () => {
        clearInterval(ping);
        events.off("active", onActive);
        events.off("completed", onDone);
        events.off("failed", onDone);
      };
      request.signal.addEventListener("abort", close);

      // Subscribed first, then read the DB, so a verdict that landed in between is not missed.
      await finishWith();
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
