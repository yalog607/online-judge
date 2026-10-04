"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateClassAction } from "@/modules/class/actions";

export function EditClassDialog({
  classId,
  initialClassName,
  initialDescription,
  initialIsPublic,
}: {
  classId: number;
  initialClassName: string;
  initialDescription: string | null;
  initialIsPublic: boolean;
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
      const result = await updateClassAction(classId, {}, formData);
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
          setError(null);
          setIsOpen(true);
        }}
        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-muted transition-colors flex items-center gap-1.5"
      >
        <span>Chỉnh sửa thông tin lớp</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h3 className="text-lg font-semibold text-fg">Chỉnh sửa thông tin lớp học</h3>
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
                  Tên lớp học <span className="text-danger">*</span>
                </label>
                <input
                  name="className"
                  type="text"
                  required
                  defaultValue={initialClassName}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Mô tả lớp học
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={initialDescription || ""}
                  placeholder="Mô tả nội dung, mục tiêu của lớp học..."
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-line bg-muted/40 p-3">
                <div>
                  <span className="block text-xs font-medium text-fg">Lớp học công khai</span>
                  <span className="block text-[11px] text-fg-muted">
                    Học sinh có thể tự do tìm kiếm và tham gia lớp
                  </span>
                </div>
                <input
                  name="isPublic"
                  type="checkbox"
                  defaultChecked={initialIsPublic}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-primary cursor-pointer"
                />
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
