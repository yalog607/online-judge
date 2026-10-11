"use client";

import Link from "next/link";
import { markReadAction } from "@/modules/notification/actions";
import { announceNotificationsChanged } from "@/components/notification-read-buttons";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NotificationItem } from "@/modules/notification/types";

const ROW = "flex w-full items-center gap-3 px-5 py-3.5 text-left";

// One row of the notifications list: unread dot, title (+ optional detail line), relative time.
// Opening a row marks it read and follows its link.
export function NotificationRow({ item }: { item: NotificationItem }) {
  const open = () => {
    if (item.isRead) return;
    void markReadAction(item.id).then(announceNotificationsChanged);
  };

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-none rounded-full ${item.isRead ? "bg-transparent" : "bg-primary"}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block">{item.title}</span>
        {item.body && <span className="block truncate text-sm text-fg-muted">{item.body}</span>}
      </span>
      <time dateTime={item.createdAt} suppressHydrationWarning className="flex-none whitespace-nowrap text-fg-muted">
        {formatRelativeTime(item.createdAt)}
      </time>
      {!item.isRead && <span className="sr-only">Chưa đọc</span>}
    </>
  );

  return item.link ? (
    <Link href={item.link} onClick={open} className={`${ROW} hover:bg-muted`}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={open} className={`${ROW} hover:bg-muted`}>
      {content}
    </button>
  );
}
