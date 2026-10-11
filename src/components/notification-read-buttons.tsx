"use client";

import { useTransition } from "react";
import { markAllReadAction, markReadAction } from "@/modules/notification/actions";

// The bell keeps its own unread count; it listens for this event to resync after a page action.
export const NOTIFICATIONS_CHANGED_EVENT = "itoj:notifications-changed";

function announce() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function MarkReadButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markReadAction(id);
          announce();
        })
      }
      className="whitespace-nowrap text-sm text-fg-muted hover:text-fg disabled:opacity-50"
    >
      Đã đọc
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllReadAction();
          announce();
        })
      }
      className="text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
    >
      Đánh dấu tất cả đã đọc
    </button>
  );
}
