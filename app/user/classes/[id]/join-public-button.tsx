
"use client";

import { useFormStatus } from "react-dom";

export function JoinPublicButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {pending ? "Đang tham gia…" : "Tham gia lớp học"}
    </button>
  );
}
