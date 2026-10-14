"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resubmitClassAction } from "@/modules/class/actions";

export function ResubmitClassButton({ classId }: { classId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resubmitClassAction(classId);
          if (result.error) {
            window.alert(result.error);
            return;
          }
          router.refresh();
        })
      }
      className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
    >
      {pending ? "Đang gửi..." : "Gửi lại đơn"}
    </button>
  );
}
