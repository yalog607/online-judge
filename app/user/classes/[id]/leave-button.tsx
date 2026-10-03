"use client";

import { useFormStatus } from "react-dom";

export function LeaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Bạn có chắc chắn muốn rời khỏi lớp học này?")) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-bad/50 bg-bad-soft px-3.5 py-2 text-sm font-medium text-bad hover:bg-bad hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
    >
      {pending ? "Đang rời…" : "Rời lớp học"}
    </button>
  );
}
