"use client";

import { useTransition } from "react";
import { useDialog } from "@/components/dialog-provider";
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
  const dialog = useDialog();

  const handleRemove = async () => {
    const ok = await dialog.confirm({
      title: "Gỡ bài tập",
      message: `Bạn có chắc muốn gỡ bài tập "${problemTitle}" khỏi lớp học này?`,
      confirmText: "Gỡ bài",
      danger: true,
    });
    if (!ok) return;

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
