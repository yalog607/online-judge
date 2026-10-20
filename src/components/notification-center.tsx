"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { markReadAction } from "@/modules/notification/actions";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  announceNotificationsChanged,
} from "@/components/notification-read-buttons";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NotificationItem, StreamMessage } from "@/modules/notification/types";

const TOAST_MS = 6000;
const MAX_TOASTS = 3;
const RETRY_MS = 15000;

const UnreadContext = createContext(0);

// Unread count kept live by the provider; the sidebar badge and the header bell both read it.
export function useUnreadCount() {
  return useContext(UnreadContext);
}

// Mounted once per page. Holds the SSE subscription, the unread count and the toast popups.
export function NotificationProvider({
  href,
  initialUnread = 0,
  children,
}: {
  href: string;
  initialUnread?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const onNotificationsPageRef = useRef(false);
  useEffect(() => {
    onNotificationsPageRef.current = pathname.endsWith("/notifications");
  }, [pathname]);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    let source: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const refreshCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (res.ok) setUnread(((await res.json()) as { unread: number }).unread);
      } catch {
        /* offline: keep the last known count */
      }
    };

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/notifications/stream");
      source.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as StreamMessage;
        if (msg.kind === "ready") {
          setUnread(msg.unread);
          return;
        }
        const item = msg.item;
        // An aggregated notification that changed in place was already counted as unread.
        if (!msg.updated) setUnread((n) => n + 1);
        setToasts((list) => [...list.filter((t) => t.id !== item.id), item].slice(-MAX_TOASTS));
        const previous = pending.get(item.id);
        if (previous) clearTimeout(previous);
        pending.set(
          item.id,
          setTimeout(() => dismiss(item.id), TOAST_MS),
        );
        if (onNotificationsPageRef.current) router.refresh();
      };
      // Stream dropped (deploy, network, Redis): sync the count now and try again later.
      source.onerror = () => {
        source?.close();
        source = undefined;
        void refreshCount();
        retry = setTimeout(connect, RETRY_MS);
      };
    };

    connect();
    // Marking read elsewhere (notifications page) asks the count to resync.
    const onChanged = () => void refreshCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      disposed = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, [dismiss, router]);

  // Toast auto-dismiss timers outlive stream reconnects; only unmount clears them.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const openToast = (item: NotificationItem) => {
    dismiss(item.id);
    if (!item.isRead) {
      setUnread((n) => Math.max(0, n - 1));
      void markReadAction(item.id);
    }
    router.push(item.link ?? href);
  };

  return (
    <UnreadContext.Provider value={unread}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-surface p-3 shadow-card"
          >
            <button type="button" onClick={() => openToast(item)} className="min-w-0 flex-1 text-left">
              <span className="block font-semibold">{item.title}</span>
              {item.body && <span className="line-clamp-2 block text-sm text-fg-muted">{item.body}</span>}
            </button>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Đóng thông báo"
              className="grid h-6 w-6 flex-none place-items-center rounded-md text-fg-muted hover:bg-muted"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </UnreadContext.Provider>
  );
}

// Header bell: opens a small panel with the most recent notifications; "Xem tất cả" goes to the full page.
export function NotificationBell({ href }: { href: string }) {
  const unread = useUnreadCount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/recent", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setItems(((await res.json()) as { items: NotificationItem[] }).items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // New notifications arriving while the panel is open refresh the list (deferred, not in the effect body).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [unread, open, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (item: NotificationItem) => {
    setOpen(false);
    if (!item.isRead) void markReadAction(item.id).then(announceNotificationsChanged);
    router.push(item.link ?? href);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative grid h-[38px] w-[38px] place-items-center rounded-[9px] border border-line bg-surface text-fg hover:bg-muted"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute right-[9px] top-2 h-2 w-2 rounded-full border-2 border-surface bg-bad" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo gần đây"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Thông báo gần đây</h2>
            {unread > 0 && <span className="text-xs text-fg-muted">{unread} chưa đọc</span>}
          </div>
          <div className="max-h-[22rem] overflow-y-auto">
            {failed ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">Không tải được thông báo.</p>
            ) : items === null ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">Chưa có thông báo nào.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-muted"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.isRead ? "bg-transparent" : "bg-primary"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{item.title}</span>
                        {item.body && <span className="block truncate text-xs text-fg-muted">{item.body}</span>}
                        <time
                          dateTime={item.createdAt}
                          suppressHydrationWarning
                          className="block text-xs text-fg-muted"
                        >
                          {formatRelativeTime(item.createdAt)}
                        </time>
                      </span>
                      {!item.isRead && <span className="sr-only">Chưa đọc</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
