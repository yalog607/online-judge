"use client";

import { useState } from "react";
import { StudentProgressModal } from "../../../teacher/classes/[id]/student-progress-modal";

export function MyProgressButton({
  classId,
  user,
}: {
  classId: number;
  user: {
    UserID: number;
    FullName: string;
    Username?: string;
    Email?: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-xs"
      >
        <span>📊 Xem tiến độ chi tiết của tôi</span>
      </button>

      {isOpen && (
        <StudentProgressModal
          classId={classId}
          student={user}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
