"use client";

import { useTransition } from "react";
import { approveTARequestAction } from "@/modules/class/actions";

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

import { setProblemStatusAction } from "@/modules/problem/actions";

export function ProblemApprovalButtons({ problemId }: { problemId: number }) {
  const [pending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      await setProblemStatusAction(problemId, "Public");
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await setProblemStatusAction(problemId, "Private"); // Or just leave it Pending, but let's say "Private" to reject
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
        title="Chuyển về Private"
      >
        Từ chối
      </button>
    </div>
  );
}
