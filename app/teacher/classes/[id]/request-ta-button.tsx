"use client";

import { useState, useTransition } from "react";
import { requestTAUpgradeAction } from "@/modules/class/actions";
import { Modal } from "@/components/modal";

export function RequestTAUpgradeButton({
  classId,
  studentId,
  studentName,
}: {
  classId: number;
  studentId: number;
  studentName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestTAUpgradeAction(classId, studentId);
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
        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
        title="Thăng cấp lên Trợ giảng"
      >
        Thăng cấp TA
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-semibold text-fg">Thăng cấp Trợ giảng</h3>
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
            <div className="mt-4 rounded-lg bg-bad-soft border border-bad/20 p-3 text-xs text-bad">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm text-fg-muted">
            <p>
              Bạn có chắc chắn muốn gửi yêu cầu thăng cấp học sinh{" "}
              <span className="font-semibold text-fg">
                {studentName ? `"${studentName}"` : "này"}
              </span>{" "}
              lên làm Trợ giảng (TA) cho lớp học này?
            </p>
            <p className="text-xs text-fg-subtle">
              Yêu cầu sẽ được chuyển đến Quản trị viên để xét duyệt. Khi được duyệt, trợ giảng có thể hỗ trợ quản lý bài tập và tài liệu học tập trong lớp.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg-muted hover:bg-muted transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {isPending ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
