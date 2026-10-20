"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestJoinClassAction } from "@/modules/class/actions";
import { Modal } from "@/components/modal";

export function JoinRequestDialog({
  classId,
  className,
  isRejected = false,
}: {
  classId: number;
  className: string;
  isRejected?: boolean;
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
      const res = await requestJoinClassAction(classId, {}, formData);
      if (res.error) {
        setError(res.error);
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
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity"
      >
        {isRejected ? "Gửi lại yêu cầu tham gia" : "Gửi yêu cầu tham gia"}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-base font-semibold text-fg">Yêu cầu tham gia lớp học</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-fg-muted hover:text-fg text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <p className="mt-3 text-xs text-fg-muted">
            Lớp <strong className="text-fg">{className}</strong> là lớp học cần duyệt. Vui lòng điền thông tin để giảng viên xem xét.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="join-message" className="mb-1 block text-xs font-medium text-fg-muted">
                Thông tin học viên <span className="text-danger">*</span>
              </label>
              <textarea
                id="join-message"
                name="message"
                required
                rows={4}
                maxLength={500}
                placeholder="Nhập mã số học viên, họ tên, lớp chuyên ngành hoặc lời nhắn gửi giảng viên..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary resize-none"
              />
              <span className="mt-1 block text-[11px] text-fg-muted">
                Tối đa 500 ký tự.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
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
                {isPending ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
