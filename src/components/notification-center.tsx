"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { listRecentAction, markReadAction } from "@/modules/notification/actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/components/notification-read-buttons";
import type { NotificationItem, StreamMessage } from "@/modules/notification/types";

const TOAST_MS = 6000;
const MAX_TOASTS = 3;
const RETRY_MS = 15000;

// Mounted once per page. Subscribes to the SSE stream, shows toast popups and (when
// `showBell`) the bell with the unread badge and a dropdown of the latest items.
export function NotificationCenter({ href, showBell = true }: { href: string; showBell?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<NotificationItem[] | null>(null);
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
        setRecent(null);
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
    const onChanged = () => {
      void refreshCount();
      setRecent(null);
    };
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (recent === null) {
      listRecentAction()
        .then((items) => !cancelled && setRecent(items))
        .catch(() => !cancelled && setRecent([]));
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, recent]);

  const openItem = (item: NotificationItem) => {
    dismiss(item.id);
    setOpen(false);
    if (!item.isRead) {
      setUnread((n) => Math.max(0, n - 1));
      setRecent(null);
      void markReadAction(item.id);
    }
    router.push(item.link ?? href);
  };

  return (
    <>
      {showBell && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
            aria-expanded={open}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg"
          >
            <Icon name="bell" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[11px] font-semibold leading-[18px] text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          {open && (
            <>
              <button
                type="button"
                aria-label="Đóng"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-card max-[820px]:fixed max-[820px]:inset-x-3 max-[820px]:top-16 max-[820px]:w-auto">
                <div className="border-b border-line px-4 py-2.5 font-semibold">Thông báo</div>
                <ul className="max-h-96 overflow-y-auto">
                  {recent === null && <li className="px-4 py-6 text-center text-fg-muted">Đang tải...</li>}
                  {recent?.length === 0 && (
                    <li className="px-4 py-6 text-center text-fg-muted">Chưa có thông báo.</li>
                  )}
                  {recent?.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                      >
                        <span className={item.isRead ? "" : "font-semibold"}>{item.title}</span>
                        {item.body && <span className="line-clamp-2 text-sm text-fg-muted">{item.body}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block border-t border-line px-4 py-2.5 text-center font-medium text-primary hover:bg-muted"
                >
                  Xem tất cả
                </Link>
              </div>
            </>
          )}
        </div>
      )}

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
            <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
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
    </>
  );
}
