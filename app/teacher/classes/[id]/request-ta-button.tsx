"use client";

import { useTransition } from "react";
import { requestTAUpgradeAction } from "@/modules/class/actions";

export function RequestTAUpgradeButton({
  classId,
  studentId,
}: {
  classId: number;
  studentId: number;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Thăng cấp học sinh này lên Trợ giảng (cần Admin duyệt)?`)) return;
    startTransition(async () => {
      const res = await requestTAUpgradeAction(classId, studentId);
      if (res?.error) alert(res.error);
      else alert("Đã gửi yêu cầu thăng cấp TA thành công!");
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="text-primary hover:underline disabled:opacity-50 ml-3"
      title="Thăng cấp lên Trợ giảng"
    >
      Thăng cấp TA
    </button>
  );
}
