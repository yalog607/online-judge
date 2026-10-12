"use client";

import { useTransition } from "react";
import { Icon } from "@/components/icon";
import { markAllReadAction } from "@/modules/notification/actions";

// The bell keeps its own unread count; it listens for this event to resync after a page action.
export const NOTIFICATIONS_CHANGED_EVENT = "itoj:notifications-changed";

export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
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
          announceNotificationsChanged();
        })
      }
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-4 py-2 font-medium transition-colors hover:bg-muted disabled:opacity-50"
    >
      <Icon name="check" size={16} />
      Đánh dấu tất cả đã đọc
    </button>
  );
}
