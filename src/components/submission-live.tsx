"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refreshes the page as soon as the judge reports progress (SSE). If the stream is
// unavailable it falls back to polling every `fallbackMs`.
export function SubmissionLive({
  submissionId,
  fallbackMs = 2000,
}: {
  submissionId: number;
  fallbackMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let source: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      poll ??= setInterval(() => router.refresh(), fallbackMs);
    };

    try {
      source = new EventSource(`/api/submissions/${submissionId}/events`);
      source.onmessage = (ev) => {
        const data = JSON.parse(ev.data) as { done?: boolean };
        router.refresh();
        if (data.done) source?.close();
      };
      source.onerror = () => {
        source?.close();
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      source?.close();
      if (poll) clearInterval(poll);
    };
  }, [router, submissionId, fallbackMs]);

  return null;
}
