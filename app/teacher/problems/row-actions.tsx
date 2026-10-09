"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteProblemAction, setProblemStatusAction } from "@/modules/problem/actions";
import type { ProblemStatus } from "@/modules/problem/repo";

export function RowActions({ 
  problemId, 
  status,
  creatorId,
  actorId,
  actorRole
}: { 
  problemId: number; 
  status: ProblemStatus;
  creatorId: number;
  actorId: number;
  actorRole: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isHidden = status === "Hidden";
  const canEdit = actorRole === "Admin" || creatorId === actorId;

  const toggleLock = () =>
    startTransition(async () => {
      await setProblemStatusAction(problemId, isHidden ? "Public" : "Hidden");
      router.refresh();
    });

  const remove = () => {
    if (!confirm("Xóa bài tập này? Hành động không thể hoàn tác.")) return;
    startTransition(async () => {
      await deleteProblemAction(problemId);
      router.refresh();
    });
  };

  if (status === "Pending" && (actorRole === "Teacher" || actorRole === "Admin")) {
    return (
      <div className="flex gap-3 text-sm">
        <button disabled={pending} onClick={() => startTransition(async () => {
          await setProblemStatusAction(problemId, "Private");
          router.refresh();
        })} className="text-ok hover:underline font-medium">
          Duyệt (Private)
        </button>
        <button disabled={pending} onClick={() => startTransition(async () => {
          await setProblemStatusAction(problemId, "Public");
          router.refresh();
        })} className="text-primary hover:underline">
          Duyệt (Public)
        </button>
        <button disabled={pending} onClick={() => {
          const reason = window.prompt("Nhập lý do từ chối (bắt buộc):");
          if (!reason?.trim()) return;
          startTransition(async () => {
            await setProblemStatusAction(problemId, "Rejected", reason.trim());
            router.refresh();
          });
        }} className="text-bad hover:underline">
          Từ chối
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 text-sm">
      {canEdit ? (
        <>
          <Link href={`/teacher/problems/${problemId}/edit`} className="text-primary hover:underline">
            Sửa
          </Link>
          <button disabled={pending} onClick={toggleLock} className="text-fg-muted hover:underline">
            {isHidden ? "Mở khóa" : "Khóa bài"}
          </button>
          <button disabled={pending} onClick={remove} className="text-bad hover:underline">
            Xóa
          </button>
        </>
      ) : (
        <span className="text-fg-muted italic">Chỉ xem</span>
      )}
    </div>
  );
}
