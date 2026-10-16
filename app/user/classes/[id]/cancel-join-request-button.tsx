"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelJoinRequestAction } from "@/modules/class/actions";

export function CancelJoinRequestButton({ classId }: { classId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm("Bạn có chắc chắn muốn hủy yêu cầu tham gia lớp này?")) return;

    startTransition(async () => {
      await cancelJoinRequestAction(classId);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isPending}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-colors disabled:opacity-50"
    >
      {isPending ? "Đang hủy..." : "Hủy yêu cầu"}
    </button>
  );
}
