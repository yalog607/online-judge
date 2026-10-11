"use client";

import { useState, useTransition } from "react";
import { impersonateAction } from "@/modules/auth/actions";

type ImpersonateUserButtonProps = {
  userId: number;
  fullName: string;
  username: string;
  role: string;
  status: "Active" | "Locked";
  isCurrentAdmin: boolean;
};

export function ImpersonateUserButton({
  userId,
  fullName,
  username,
  role,
  status,
  isCurrentAdmin,
}: ImpersonateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isCurrentAdmin || role === "Admin" || status !== "Active") {
    return null;
  }

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await impersonateAction(userId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Mô phỏng người dùng thất bại.");
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
        title={`Mô phỏng ${fullName}`}
        className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-primary-fg transition-colors gap-1 cursor-pointer"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span>Mô phỏng</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !pending && setIsOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 text-left shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-semibold text-fg">
              Xác nhận mô phỏng người dùng
            </h3>

            <p className="mt-2.5 text-sm text-fg-muted leading-relaxed">
              Bạn có chắc chắn muốn mô phỏng tài khoản của{" "}
              <strong className="text-fg font-semibold">{fullName}</strong>{" "}
              <span className="font-mono text-xs text-fg-muted">(@{username})</span> với vai trò{" "}
              <strong className="text-fg">{role}</strong>? Hệ thống sẽ tạm thời chuyển sang giao diện
              và quyền hạn của người dùng này. Bạn có thể quay lại bất kỳ lúc nào bằng nút &quot;Thoát mô phỏng&quot; ở đầu trang.
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-bad/30 bg-bad-soft p-3 text-xs text-bad">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-sm font-medium text-fg hover:bg-line transition disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition disabled:opacity-50"
              >
                {pending ? "Đang chuyển..." : "Xác nhận mô phỏng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
