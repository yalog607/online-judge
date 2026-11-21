"use client";

import { useEffect, useState } from "react";

type NotificationBannerProps = {
  message: string;
  type?: "ok" | "bad" | "info";
  autoDismissSeconds?: number;
};

export function NotificationBanner({
  message,
  type = "ok",
  autoDismissSeconds = 6,
}: NotificationBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("success") || url.searchParams.has("name")) {
        url.searchParams.delete("success");
        url.searchParams.delete("name");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }

    if (autoDismissSeconds > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, autoDismissSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDismissSeconds]);

  if (!visible) return null;

  const colorStyles =
    type === "ok"
      ? "border-ok/30 bg-ok-soft text-ok"
      : type === "bad"
        ? "border-bad/30 bg-bad-soft text-bad"
        : "border-primary/30 bg-primary-soft text-primary";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-card transition-all ${colorStyles}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {type === "ok" && (
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ok/15 text-ok">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {type === "bad" && (
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-bad/15 text-bad">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        {type === "info" && (
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        )}
        <span className="truncate">{message}</span>
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Đóng thông báo"
        className="flex-none rounded-md p-1 text-current opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
