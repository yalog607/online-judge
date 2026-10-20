"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelClassAction } from "@/modules/class/actions";
import { useDialog } from "@/components/dialog-provider";

export function CancelClassButton({
  classId,
  className,
}: {
  classId: number;
  className: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const cancel = async () => {
    const ok = await dialog.confirm({
      title: "Hủy lớp học",
      message: `Hủy lớp “${className}”? Học viên sẽ chỉ xem được lịch sử và không thể nộp bài mới.`,
      confirmText: "Hủy lớp",
      cancelText: "Giữ lại",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelClassAction(classId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={cancel}
        className="font-medium text-bad hover:underline disabled:opacity-50"
      >
        {pending ? "Đang hủy..." : "Hủy lớp"}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </span>
  );
}
