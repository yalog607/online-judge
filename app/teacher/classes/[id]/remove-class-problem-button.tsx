"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeClassProblemAction } from "@/modules/class/actions";

export function RemoveClassProblemButton({
  classId,
  problemId,
  problemTitle,
}: {
  classId: number;
  problemId: number;
  problemTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!confirm(`Bạn có chắc muốn gỡ bài tập "${problemTitle}" khỏi lớp học này?`)) return;

    startTransition(async () => {
      await removeClassProblemAction(classId, problemId);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-bad hover:underline disabled:opacity-50"
    >
      {isPending ? "Đang gỡ..." : "Gỡ bài"}
    </button>
  );
}
