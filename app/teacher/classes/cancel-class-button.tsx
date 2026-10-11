"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelClassAction } from "@/modules/class/actions";

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

  const cancel = () => {
    if (!window.confirm(`Hủy lớp “${className}”? Học sinh sẽ chỉ xem được lịch sử và không thể nộp bài mới.`)) return;
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
