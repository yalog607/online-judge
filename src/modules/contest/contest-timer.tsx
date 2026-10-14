"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function ContestTimer({
  startTime,
  endTime,
  status,
}: {
  startTime: string;
  endTime: string;
  status: "Upcoming" | "Ongoing" | "Ended";
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  useEffect(() => {
    if (status === "Upcoming" && now >= startMs) {
      router.refresh();
    } else if (status === "Ongoing" && now >= endMs) {
      router.refresh();
    }
  }, [now, status, startMs, endMs, router]);

  if (status === "Upcoming") {
    const diff = startMs - now;
    if (diff <= 0) {
      return (
        <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Đang mở phòng thi...
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Mở sau: <strong className="font-mono text-sm">{formatDuration(diff)}</strong></span>
      </div>
    );
  }

  if (status === "Ongoing") {
    const diff = endMs - now;
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Còn lại: <strong className="font-mono text-sm">{formatDuration(diff)}</strong></span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-fg-muted border border-line">
      <span>Đã kết thúc</span>
    </div>
  );
}
