"use client";

import { useTransition } from "react";
import { useDialog } from "@/components/dialog-provider";
import { approveTARequestAction, approveClassRequestAction } from "@/modules/class/actions";

export function ApprovalButtons({ requestId }: { requestId: number }) {
  const [pending, startTransition] = useTransition();
  const dialog = useDialog();

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveTARequestAction(requestId, true);
      if (res?.error) void dialog.alert(res.error);
    });
  };

  const handleReject = async () => {
    const reason = await dialog.prompt({
      title: "Từ chối yêu cầu trợ giảng",
      message: "Vui lòng nhập lý do từ chối yêu cầu trợ giảng này.",
      label: "Lý do từ chối",
      confirmText: "Từ chối",
      danger: true,
    });
    if (reason === null) return;

    startTransition(async () => {
      const res = await approveTARequestAction(requestId, false, reason);
      if (res?.error) void dialog.alert(res.error);
    });
  };

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={handleApprove}
        className="text-ok hover:underline disabled:opacity-50"
      >
        Duyệt
      </button>
      <button
        disabled={pending}
        onClick={handleReject}
        className="text-bad hover:underline disabled:opacity-50"
      >
        Từ chối
      </button>
    </div>
  );
}

export function ClassApprovalButtons({ classId }: { classId: number }) {
  const [pending, startTransition] = useTransition();
  const dialog = useDialog();

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveClassRequestAction(classId, true);
      if (res?.error) void dialog.alert(res.error);
    });
  };

  const handleReject = async () => {
    const reason = await dialog.prompt({
      title: "Từ chối lớp học",
      message: "Vui lòng nhập lý do từ chối lớp học này.",
      label: "Lý do từ chối",
      confirmText: "Từ chối",
      danger: true,
    });
    if (reason === null) return;

    startTransition(async () => {
      const res = await approveClassRequestAction(classId, false, reason);
      if (res?.error) void dialog.alert(res.error);
    });
  };

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={handleApprove}
        className="text-ok hover:underline disabled:opacity-50"
      >
        Duyệt
      </button>
      <button
        disabled={pending}
        onClick={handleReject}
        className="text-bad hover:underline disabled:opacity-50"
      >
        Từ chối
      </button>
    </div>
  );
}
