"use client";

import { useTransition } from "react";
import { approveTARequestAction, approveClassRequestAction } from "@/modules/class/actions";

export function ApprovalButtons({ requestId }: { requestId: number }) {
  const [pending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveTARequestAction(requestId, true);
      if (res?.error) alert(res.error);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const res = await approveTARequestAction(requestId, false);
      if (res?.error) alert(res.error);
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

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveClassRequestAction(classId, true);
      if (res?.error) alert(res.error);
    });
  };

  const handleReject = () => {
    const reason = window.prompt("Vui lòng nhập lý do từ chối lớp học này:");
    if (reason === null) return; // User cancelled
    
    startTransition(async () => {
      const res = await approveClassRequestAction(classId, false, reason);
      if (res?.error) alert(res.error);
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
