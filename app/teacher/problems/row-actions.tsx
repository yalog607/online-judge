"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteProblemAction, setProblemStatusAction } from "@/modules/problem/actions";
import type { ProblemStatus } from "@/modules/problem/repo";

export function RowActions({ problemId, status }: { problemId: number; status: ProblemStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isLocked = status === "Locked" || status === "Hidden";

  const toggleLock = () =>
    startTransition(async () => {
      await setProblemStatusAction(problemId, isLocked ? "Public" : "Locked");
      router.refresh();
    });

  const remove = () => {
    if (!confirm("Xóa bài tập này? Hành động không thể hoàn tác.")) return;
    startTransition(async () => {
      await deleteProblemAction(problemId);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-3 text-sm">
      <Link href={`/teacher/problems/${problemId}/edit`} className="text-primary hover:underline">
        Sửa
      </Link>
      <button disabled={pending} onClick={toggleLock} className="text-fg-muted hover:underline">
        {isLocked ? "Mở khóa" : "Khóa bài"}
      </button>
      <button disabled={pending} onClick={remove} className="text-bad hover:underline">
        Xóa
      </button>
    </div>
  );
}
