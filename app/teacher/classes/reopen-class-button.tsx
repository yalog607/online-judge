"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reopenClassAction } from "@/modules/class/actions";
import { useDialog } from "@/components/dialog-provider";

export function ReopenClassButton({
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

  const reopen = async () => {
    const ok = await dialog.confirm({
      title: "Mở lại lớp học",
      message: `Mở lại lớp “${className}”? Lớp sẽ hoạt động trở lại, học viên có thể nộp bài mới.`,
      confirmText: "Mở lại lớp",
      cancelText: "Để sau",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await reopenClassAction(classId);
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
        onClick={reopen}
        className="font-medium text-primary hover:underline disabled:opacity-50"
      >
        {pending ? "Đang mở..." : "Mở lại lớp"}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </span>
  );
}
