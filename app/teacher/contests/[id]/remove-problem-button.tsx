"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeContestProblemAction } from "@/modules/contest/actions";

export function RemoveProblemButton({
  contestId,
  problemId,
  problemTitle,
}: {
  contestId: number;
  problemId: number;
  problemTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!window.confirm(`Bạn có chắc muốn gỡ bài tập "${problemTitle}" khỏi kỳ thi này?`)) {
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
