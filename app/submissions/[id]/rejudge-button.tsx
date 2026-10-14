"use client";

import { useTransition } from "react";
import { useDialog } from "@/components/dialog-provider";
import { rejudgeAction } from "@/modules/submission/actions";

export function RejudgeButton({ submissionId }: { submissionId: number }) {
  const [pending, start] = useTransition();
  const dialog = useDialog();

  return (
    <button
      onClick={async () => {
        const ok = await dialog.confirm({
          title: "Chấm lại bài nộp",
          message: "Chấm lại bài nộp này?",
          confirmText: "Chấm lại",
        });
        if (!ok) return;
        start(async () => {
          const res = await rejudgeAction(submissionId);
          if (res.error) void dialog.alert(res.error);
        });
      }}
      disabled={pending}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
    >
      {pending ? "Đang xử lý..." : "Chấm lại (Rejudge)"}
    </button>
  );
}
