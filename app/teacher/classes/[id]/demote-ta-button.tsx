"use client";

import { useState, useTransition } from "react";
import { removeTAAction } from "@/modules/class/actions";
import { useDialog } from "@/components/dialog-provider";

export function DemoteTAButton({
  classId,
  userId,
  userName,
}: {
  classId: number;
  userId: number;
  userName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog();

  const demote = async () => {
    const ok = await dialog.confirm({
      title: "Giáng chức trợ giảng",
      message: `Gỡ vai trò trợ giảng của “${userName}” ở lớp này? Họ vẫn là học viên của lớp.`,
      confirmText: "Giáng chức",
      cancelText: "Hủy",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await removeTAAction(classId, userId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={demote}
        className="text-xs font-semibold text-bad hover:underline disabled:opacity-50"
        title="Gỡ vai trò trợ giảng"
      >
        {pending ? "Đang xử lý..." : "Giáng chức TA"}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </span>
  );
}
