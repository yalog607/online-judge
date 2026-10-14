"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeContestProblemAction } from "@/modules/contest/actions";

export function RemoveProblemButton({
  contestId,
  problemId,
  problemTitle,
  isOngoing = false,
}: {
  contestId: number;
  problemId: number;
  problemTitle: string;
  isOngoing?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    const confirmMessage = isOngoing
      ? `Kỳ thi đang diễn ra! Bạn có chắc muốn gỡ bài tập "${problemTitle}" khỏi kỳ thi này? Điểm số của bài này sẽ được gỡ và bảng xếp hạng sẽ được tính lại tự động cho các thí sinh.`
      : `Bạn có chắc muốn gỡ bài tập "${problemTitle}" khỏi kỳ thi này?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    startTransition(async () => {
      const result = await removeContestProblemAction(contestId, problemId);
      if (result.ok) {
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-danger hover:underline disabled:opacity-50"
    >
      {isPending ? "Đang gỡ..." : "Gỡ"}
    </button>
  );
}
