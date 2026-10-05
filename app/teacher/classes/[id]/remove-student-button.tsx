"use client";

import { useTransition } from "react";
import { removeStudentAction } from "@/modules/class/actions";

export function RemoveStudentButton({
  classId,
  studentId,
  studentName,
}: {
  classId: number;
  studentId: number;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học sinh "${studentName}" khỏi lớp học này?`)) {
      return;
    }
    startTransition(async () => {
      await removeStudentAction(classId, studentId);
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleRemove}
      className="text-xs font-medium text-bad hover:underline disabled:opacity-50 cursor-pointer"
    >
      {pending ? "Đang xóa…" : "Xóa khỏi lớp"}
    </button>
  );
}
