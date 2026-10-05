"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addContestProblemAction } from "@/modules/contest/actions";

interface AvailableProblem {
  problemId: number;
  title: string;
  difficulty: string;
}

export function AddProblemDialog({
  contestId,
  availableProblems,
  nextOrderIndex,
}: {
  contestId: number;
  availableProblems: AvailableProblem[];
  nextOrderIndex: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addContestProblemAction(contestId, {}, formData);
      if (result?.error) {
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
          setError(null);
          setIsOpen(true);
        }}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity flex items-center gap-1.5"
      >
        <span>+ Thêm bài tập</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h3 className="text-lg font-semibold text-fg">Thêm bài tập vào kỳ thi</h3>
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
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Chọn bài tập <span className="text-danger">*</span>
                </label>
                <select
                  name="problemId"
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                >
                  <option value="">-- Chọn bài tập từ hệ thống --</option>
                  {availableProblems.map((p) => (
                    <option key={p.problemId} value={p.problemId}>
                      #{p.problemId} - {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Điểm tối đa <span className="text-danger">*</span>
                  </label>
                  <input
                    name="maxScore"
                    type="number"
                    min={1}
                    max={1000}
                    defaultValue={100}
                    required
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Thứ tự hiển thị
                  </label>
                  <input
                    name="orderIndex"
                    type="number"
                    min={0}
                    defaultValue={nextOrderIndex}
                    required
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? "Đang thêm..." : "Thêm bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
