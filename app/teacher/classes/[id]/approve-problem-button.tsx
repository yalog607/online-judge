
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProblemStatusAction } from "@/modules/problem/actions";

export function ApproveProblemButton({
  problemId,
}: {
  problemId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await setProblemStatusAction(problemId, "Private");
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="text-xs text-ok hover:underline disabled:opacity-50"
      >
        {isPending ? "..." : "Duyệt (Private)"}
      </button>
      <button
        type="button"
        onClick={() => {
          startTransition(async () => {
            await setProblemStatusAction(problemId, "Public");
            router.refresh();
          });
        }}
        disabled={isPending}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        Duyệt (Public)
      </button>
      <button
        type="button"
        onClick={() => {
          const reason = window.prompt("Nhập lý do từ chối (bắt buộc):");
          if (!reason?.trim()) return;
          startTransition(async () => {
            await setProblemStatusAction(problemId, "Rejected", reason.trim());
            router.refresh();
          });
        }}
        disabled={isPending}
        className="text-xs text-bad hover:underline disabled:opacity-50"
      >
        Từ chối
      </button>
    </div>
  );
}
