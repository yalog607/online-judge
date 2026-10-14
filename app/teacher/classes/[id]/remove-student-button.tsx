"use client";

import { useState, useTransition } from "react";
import { removeStudentAction } from "@/modules/class/actions";
import { Modal } from "@/components/modal";

export function RemoveStudentButton({
  classId,
  studentId,
  studentName,
}: {
  classId: number;
  studentId: number;
  studentName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await removeStudentAction(classId, studentId);
        setIsOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Xóa học sinh thất bại.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="text-xs font-medium text-bad hover:underline disabled:opacity-50 cursor-pointer"
      >
        Xóa khỏi lớp
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2 text-bad font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="text-lg font-semibold text-fg">Xóa học sinh khỏi lớp</h3>
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
              Bạn có chắc chắn muốn xóa học sinh <span className="font-semibold text-fg">&ldquo;{studentName}&rdquo;</span> khỏi lớp học này?
            </p>
            <p className="text-xs text-fg-subtle">
              Sau khi xóa, học sinh sẽ không thể tiếp tục truy cập các bài tập, tài liệu của lớp và tiến độ nộp bài của học sinh sẽ bị hủy liên kết khỏi lớp học.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              disabled={pending}
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-fg-muted hover:bg-muted transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleRemove}
              className="rounded-lg bg-bad px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {pending ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
