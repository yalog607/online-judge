"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startContestNowAction } from "@/modules/contest/actions";

export function StartContestDialog({
  contestId,
  currentStatus,
  contestName,
}: {
  contestId: number;
  currentStatus: "Upcoming" | "Ongoing" | "Ended";
  contestName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const result = await startContestNowAction(contestId, duration);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  const getButtonText = () => {
    if (currentStatus === "Upcoming") return "Mở kỳ thi ngay";
    if (currentStatus === "Ended") return "Mở lại kỳ thi";
    return "Gia hạn thời gian";
  };

  const getButtonClass = () => {
    if (currentStatus === "Upcoming") {
      return "rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm";
    }
    if (currentStatus === "Ended") {
      return "rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity shadow-sm";
    }
    return "rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted transition-colors";
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className={getButtonClass()}
      >
        {getButtonText()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h3 className="text-base font-semibold text-fg">
                {currentStatus === "Upcoming"
                  ? "Bắt đầu kỳ thi ngay"
                  : currentStatus === "Ended"
                    ? "Mở lại kỳ thi"
                    : "Gia hạn thời gian kỳ thi"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <p className="text-xs text-fg-muted leading-relaxed">
                Hệ thống sẽ cập nhật thời gian bắt đầu của kỳ thi <strong>{contestName}</strong> về thời điểm hiện tại và mở đề thi ngay lập tức cho học sinh làm bài.
              </p>

              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Thời lượng làm bài (phút) <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                  <span className="text-xs text-fg-muted whitespace-nowrap">phút</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                        duration === mins
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-line bg-muted/40 text-fg-muted hover:text-fg"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isPending ? "Đang xử lý..." : "Xác nhận mở kỳ thi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
