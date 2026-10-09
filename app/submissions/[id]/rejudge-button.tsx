"use client";

import { useTransition } from "react";
import { rejudgeAction } from "@/modules/submission/actions";

export function RejudgeButton({ submissionId }: { submissionId: number }) {
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Chấm lại bài nộp này?")) {
          start(async () => {
            const res = await rejudgeAction(submissionId);
            if (res.error) alert(res.error);
          });
        }
      }}
      disabled={pending}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
    >
      {pending ? "Đang xử lý..." : "Chấm lại (Rejudge)"}
    </button>
  );
}
