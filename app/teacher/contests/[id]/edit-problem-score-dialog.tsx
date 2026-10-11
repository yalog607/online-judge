"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateContestProblemScoreAction } from "@/modules/contest/actions";

export function EditProblemScoreDialog({
  contestId,
  problemId,
  problemTitle,
  currentScore,
  isOngoing = false,
}: {
  contestId: number;
  problemId: number;
  problemTitle: string;
  currentScore: number;
  isOngoing?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(currentScore);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateContestProblemScoreAction(contestId, problemId, Number(score));
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setScore(currentScore);
          setError(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-fg-muted hover:border-primary hover:text-primary transition-colors"
        title="Chỉnh sửa điểm tối đa"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>Sửa điểm</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-semibold text-fg">Đổi điểm bài tập</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <div>
                <span className="text-xs text-fg-muted block mb-1">Bài tập</span>
                <p className="text-sm font-semibold text-fg truncate">
                  #{problemId} - {problemTitle}
                </p>
              </div>

              {isOngoing && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  Kỳ thi đang diễn ra. Thay đổi điểm số sẽ tự động cập nhật lại tổng điểm của các thí sinh đã giải bài này.
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Điểm tối đa mới <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg-muted hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Đang lưu..." : "Cập nhật điểm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
