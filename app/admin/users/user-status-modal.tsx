"use client";

import { useState, useTransition } from "react";
import { setUserStatusAction } from "@/modules/auth/actions";

type UserStatusButtonProps = {
  userId: number;
  fullName: string;
  username: string;
  status: "Active" | "Locked";
  isCurrentAdmin: boolean;
};

export function UserStatusButton({
  userId,
  fullName,
  username,
  status,
  isCurrentAdmin,
}: UserStatusButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isCurrentAdmin) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-fg-muted italic">
        (Tài khoản của bạn)
      </span>
    );
  }

  const nextStatus: "Active" | "Locked" = status === "Active" ? "Locked" : "Active";
  const isLocking = nextStatus === "Locked";

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", String(userId));
      fd.append("status", nextStatus);

      const res = await setUserStatusAction({}, fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
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
        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
          isLocking
            ? "border border-bad/30 bg-bad-soft text-bad hover:bg-bad hover:text-white"
            : "border border-ok/30 bg-ok-soft text-ok hover:bg-ok hover:text-white"
        }`}
      >
        {isLocking ? "Khóa tài khoản" : "Mở khóa"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !pending && setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 text-left shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-semibold text-fg">
              {isLocking ? "Xác nhận khóa tài khoản" : "Xác nhận mở khóa tài khoản"}
            </h3>

            <p className="mt-2.5 text-sm text-fg-muted leading-relaxed">
              {isLocking ? (
                <>
                  Bạn có chắc chắn muốn khóa tài khoản của{" "}
                  <strong className="text-fg font-semibold">{fullName}</strong>{" "}
                  <span className="font-mono text-xs text-fg-muted">(@{username})</span>? Người dùng
                  sẽ bị thu hồi toàn bộ phiên hoạt động ngay lập tức và không thể đăng nhập.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn mở khóa tài khoản của{" "}
                  <strong className="text-fg font-semibold">{fullName}</strong>{" "}
                  <span className="font-mono text-xs text-fg-muted">(@{username})</span>? Người dùng
                  sẽ có thể đăng nhập và sử dụng hệ thống bình thường trở lại.
                </>
              )}
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-bad/30 bg-bad-soft p-3 text-xs text-bad">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
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
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                  isLocking ? "bg-bad hover:opacity-90" : "bg-ok hover:opacity-90"
                }`}
              >
                {pending
                  ? "Đang xử lý..."
                  : isLocking
                    ? "Xác nhận khóa"
                    : "Xác nhận mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
