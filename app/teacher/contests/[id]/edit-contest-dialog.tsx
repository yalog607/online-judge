"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateContestAction } from "@/modules/contest/actions";
import { ContestOverview } from "@/modules/contest/schema";

interface ClassOption {
  classId: number;
  className: string;
}

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditContestDialog({
  contest,
  classes,
}: {
  contest: ContestOverview;
  classes: ClassOption[];
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
      const result = await updateContestAction(contest.contestId, {}, formData);
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
        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted transition-colors flex items-center gap-1.5"
      >
        <span>Chỉnh sửa kỳ thi</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h3 className="text-lg font-semibold text-fg">Chỉnh sửa kỳ thi</h3>
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
                  Tên kỳ thi <span className="text-danger">*</span>
                </label>
                <input
                  name="contestName"
                  type="text"
                  required
                  defaultValue={contest.contestName}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Mô tả kỳ thi
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={contest.description || ""}
                  placeholder="Mô tả nội dung, quy định của kỳ thi..."
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Thời gian bắt đầu <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="startTime"
                      type="datetime-local"
                      required
                      defaultValue={toLocalDatetimeInput(contest.startTime)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm text-fg outline-none focus:border-primary cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-fg-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Thời gian kết thúc <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="endTime"
                      type="datetime-local"
                      required
                      defaultValue={toLocalDatetimeInput(contest.endTime)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm text-fg outline-none focus:border-primary cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-fg-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Lớp học áp dụng
                  </label>
                  <select
                    name="classId"
                    defaultValue={contest.classId || ""}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                  >
                    <option value="">-- Mở toàn hệ thống --</option>
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    Mật khẩu tham gia
                  </label>
                  <input
                    name="password"
                    type="password"
                    defaultValue={contest.isProtected ? "__KEEP__" : ""}
                    placeholder={contest.isProtected ? "Đang có mật khẩu (đổi hoặc xóa)" : "Để trống nếu không đặt"}
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
                  {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
