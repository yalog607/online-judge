"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveClassAction } from "@/modules/class/actions";

export default function LeaveClassDialog({
  classId,
  className,
}: {
  classId: number;
  className: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    setError(null);
    startTransition(async () => {
      const result = await leaveClassAction(classId);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/user/classes");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
      >
        Rời lớp học
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-rose-500 font-semibold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-fg">Rời lớp học</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm text-fg-muted">
              <p>
                Bạn có chắc chắn muốn rời khỏi lớp học <span className="font-semibold text-fg">&ldquo;{className}&rdquo;</span>?
              </p>
              <p className="text-xs text-fg-subtle">
                Sau khi rời khỏi lớp học, bạn sẽ không thể tiếp tục truy cập các bài tập riêng, tài liệu của lớp và tiến độ học tập có thể bị ảnh hưởng.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang rời..." : "Xác nhận rời lớp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { LeaveClassDialog };

export function LeaveButton({
  classId,
  className,
}: {
  classId?: number;
  className?: string;
}) {
  if (!classId) return null;
  return <LeaveClassDialog classId={classId} className={className ?? "lớp học"} />;
}
