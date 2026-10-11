"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { markReadAction } from "@/modules/notification/actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/components/notification-read-buttons";
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

// Header bell: a bordered square button linking to the notifications page, red dot when unread.
export function NotificationBell({ href }: { href: string }) {
  const unread = useUnreadCount();
  return (
    <Link
      href={href}
      aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      className="relative grid h-[38px] w-[38px] place-items-center rounded-[9px] border border-line bg-surface text-fg hover:bg-muted"
    >
      <Icon name="bell" />
      {unread > 0 && (
        <span className="absolute right-[9px] top-2 h-2 w-2 rounded-full border-2 border-surface bg-bad" />
      )}
    </Link>
  );
}
