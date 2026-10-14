
"use client";

import { useTransition } from "react";
import { useDialog } from "@/components/dialog-provider";
import { useRouter } from "next/navigation";
import { setProblemStatusAction } from "@/modules/problem/actions";

export function ApproveProblemButton({
  problemId,
}: {
  problemId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();

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
        onClick={async () => {
          const reason = await dialog.prompt({
            title: "Từ chối bài tập",
            message: "Ghi rõ nội dung cần chỉnh sửa để người gửi có thể nộp lại.",
            label: "Lý do từ chối (bắt buộc)",
            confirmText: "Từ chối",
            danger: true,
          });
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
