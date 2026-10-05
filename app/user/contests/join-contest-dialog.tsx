"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { joinContestAction } from "@/modules/contest/actions";

export function JoinContestDialog({
  contestId,
  contestName,
  isProtected,
}: {
  contestId: number;
  contestName: string;
  isProtected: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleJoin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await joinContestAction(contestId, {}, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push(`/user/contests/${contestId}`);
        router.refresh();
      }
    });
  };

  const handleOpen = () => {
    if (!isProtected) {
      startTransition(async () => {
        const result = await joinContestAction(contestId, {}, new FormData());
        if (result?.error) {
          alert(result.error);
        } else {
          router.push(`/user/contests/${contestId}`);
          router.refresh();
        }
      });
      return;
    }
    setError(null);
    setIsOpen(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Đang xử lý..." : "Tham gia kỳ thi"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h3 className="text-base font-semibold text-fg">Nhập mật khẩu kỳ thi</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-4">
              <p className="text-xs text-fg-muted">
                Kỳ thi <strong>{contestName}</strong> được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu do giáo viên cung cấp để tham gia.
              </p>

              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Mật khẩu kỳ thi <span className="text-danger">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? "Đang xác thực..." : "Vào kỳ thi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
