"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cloneProblemAction, deleteProblemAction, setProblemStatusAction } from "@/modules/problem/actions";
import { Modal } from "@/components/modal";
import { useDialog } from "@/components/dialog-provider";
import type { ProblemStatus } from "@/modules/problem/repo";

export function RowActions({ 
  problemId, 
  problemTitle,
  status,
  proposedStatus,
  actorRole,
  canManage,
}: { 
  problemId: number; 
  problemTitle?: string;
  status: ProblemStatus;
  proposedStatus?: "Public" | "Private" | null;
  actorRole: string;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTitle, setCloneTitle] = useState("");
  const router = useRouter();
  const dialog = useDialog();

  const isHidden = status === "Hidden";
  const canEdit = canManage;
  const canClone = actorRole === "Teacher" || actorRole === "Admin";
  const suggestedStatus = proposedStatus === "Public" || proposedStatus === "Private" ? proposedStatus : null;

  const toggleLock = () =>
    startTransition(async () => {
      await setProblemStatusAction(problemId, isHidden ? "Public" : "Hidden");
      router.refresh();
    });

  const remove = async () => {
    const ok = await dialog.confirm({
      title: "Xóa bài tập",
      message: "Xóa bài tập này? Hành động không thể hoàn tác.",
      confirmText: "Xóa",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteProblemAction(problemId);
      router.refresh();
    });
  };

  if (status === "Pending" && actorRole === "Teacher") {
    return (
      <div className="grid grid-cols-[112px_112px_86px] items-center justify-end gap-2">
        {(["Private", "Public"] as const).map((nextStatus) => {
          const label = nextStatus === "Private" ? "Riêng tư" : "Công khai";
          const isSuggested = suggestedStatus === nextStatus;
          return (
            <button
              key={nextStatus}
              type="button"
              disabled={pending}
              title={isSuggested ? `Đây là trạng thái trợ giảng đề xuất: ${label}` : `Duyệt và đặt trạng thái ${label}`}
              aria-label={`Duyệt ${label}${isSuggested ? " theo lựa chọn được gửi" : ""}`}
              onClick={() => startTransition(async () => {
                await setProblemStatusAction(problemId, nextStatus);
                router.refresh();
              })}
              className={`inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                isSuggested
                  ? "border-primary bg-primary text-primary-fg shadow-sm hover:opacity-90"
                  : nextStatus === "Private"
                    ? "border-line bg-surface text-fg hover:bg-muted"
                    : "border-ok/30 bg-ok-soft text-ok hover:bg-ok-soft/70"
              }`}
            >
              Duyệt {label}
            </button>
          );
        })}
        <button disabled={pending} type="button" onClick={() => setRejectOpen(true)} className="inline-flex min-h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border border-bad/30 bg-bad-soft px-2 py-2 text-[11px] font-semibold text-bad transition-colors hover:bg-bad-soft/70 disabled:cursor-wait disabled:opacity-60">
          Từ chối
        </button>
        <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby={`reject-title-${problemId}`} className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 text-left shadow-2xl">
              <h2 id={`reject-title-${problemId}`} className="text-lg font-semibold text-fg">Từ chối bài tập</h2>
              <p className="mt-1 text-sm text-fg-muted">Ghi rõ nội dung cần chỉnh sửa để trợ giảng có thể gửi lại bài.</p>
              <label htmlFor={`reject-reason-${problemId}`} className="mt-4 block text-sm font-medium text-fg">Lý do từ chối</label>
              <textarea
                id={`reject-reason-${problemId}`}
                autoFocus
                required
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={4}
                placeholder="Ví dụ: cần bổ sung giới hạn dữ liệu và testcase..."
                className="mt-1.5 w-full resize-y rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-fg outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary-soft"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" disabled={pending} onClick={() => setRejectOpen(false)} className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg hover:bg-muted disabled:opacity-60">Hủy</button>
                <button
                  type="button"
                  disabled={pending || !rejectionReason.trim()}
                  onClick={() => startTransition(async () => {
                    await setProblemStatusAction(problemId, "Rejected", rejectionReason.trim());
                    setRejectOpen(false);
                    setRejectionReason("");
                    router.refresh();
                  })}
                  className="rounded-lg border border-bad bg-bad px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Đang lưu..." : "Xác nhận từ chối"}
                </button>
              </div>
            </section>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {canClone && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setCloneTitle(`[Bản sao] ${problemTitle || ""}`);
            setCloneOpen(true);
          }}
          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 font-medium text-fg hover:bg-muted transition-colors disabled:opacity-60"
          title="Nhân bản bài tập này vào ngân hàng của bạn"
        >
          Nhân bản
        </button>
      )}
      {canEdit ? (
        <>
          <Link href={`/teacher/problems/${problemId}/edit`} className="inline-flex min-h-9 items-center rounded-lg border border-line bg-surface px-3 py-2 font-medium text-primary transition-colors hover:bg-muted">
            Sửa
          </Link>
          <button type="button" disabled={pending} onClick={toggleLock} className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-fg-muted transition-colors hover:bg-muted disabled:opacity-60">
            {isHidden ? "Mở khóa" : "Khóa bài"}
          </button>
          <button type="button" disabled={pending} onClick={remove} className="inline-flex min-h-9 items-center rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 font-medium text-bad transition-colors hover:bg-bad-soft/70 disabled:opacity-60">
            Xóa
          </button>
        </>
      ) : (
        <Link href={`/teacher/problems/${problemId}`} className="inline-flex min-h-9 items-center rounded-lg border border-line bg-muted px-3 py-2 text-fg-muted transition-colors hover:text-fg">
          Xem bài
        </Link>
      )}
      <Modal isOpen={cloneOpen} onClose={() => setCloneOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby={`clone-title-${problemId}`} className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 text-left shadow-2xl">
            <h2 id={`clone-title-${problemId}`} className="text-lg font-semibold text-fg">Nhân bản bài tập</h2>
            <p className="mt-1 text-sm text-fg-muted">Tạo một bản sao độc lập của bài tập này (bao gồm toàn bộ đề bài, giới hạn và testcase) để đưa vào ngân hàng bài tập của bạn.</p>
            <label htmlFor={`clone-name-${problemId}`} className="mt-4 block text-sm font-medium text-fg">Tên bài tập mới</label>
            <input
              id={`clone-name-${problemId}`}
              autoFocus
              required
              value={cloneTitle}
              onChange={(event) => setCloneTitle(event.target.value)}
              maxLength={200}
              placeholder="Nhập tên bài tập..."
              className="mt-1.5 w-full rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-fg outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary-soft"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={pending} onClick={() => setCloneOpen(false)} className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg hover:bg-muted disabled:opacity-60">Hủy</button>
              <button
                type="button"
                disabled={pending || !cloneTitle.trim()}
                onClick={() => startTransition(async () => {
                  const res = await cloneProblemAction(problemId, cloneTitle.trim());
                  setCloneOpen(false);
                  if (res.ok && res.problem) {
                    router.push(`/teacher/problems?success=cloned&name=${encodeURIComponent(res.problem.Title)}`);
                    router.refresh();
                  }
                })}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Đang nhân bản..." : "Xác nhận nhân bản"}
              </button>
            </div>
          </section>
      </Modal>
    </div>
  );
}
