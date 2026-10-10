"use client";

import { useState, useTransition } from "react";
import { setUserRoleAction } from "@/modules/auth/actions";
import type { Role } from "@/lib/session";

type UserRoleButtonProps = {
  userId: number;
  fullName: string;
  username: string;
  currentRole: Role;
  isCurrentAdmin: boolean;
};

const ROLES: {
  role: "User" | "TA" | "Teacher";
  label: string;
  badgeText: string;
  desc: string;
}[] = [
  {
    role: "User",
    label: "Học viên (User)",
    badgeText: "Học viên",
    desc: "Tham gia giải bài tập, làm bài kiểm tra trong lớp học và kỳ thi.",
  },
  {
    role: "TA",
    label: "Trợ giảng (TA)",
    badgeText: "Trợ giảng",
    desc: "Hỗ trợ giáo viên chấm bài, duyệt bài tập và hỗ trợ quản lý học sinh trong lớp.",
  },
  {
    role: "Teacher",
    label: "Giáo viên (Teacher)",
    badgeText: "Giáo viên",
    desc: "Toàn quyền tạo lớp học, xuất bản bài tập, tổ chức kỳ thi và quản trị điểm số.",
  },
];

export function UserRoleButton({
  userId,
  fullName,
  username,
  currentRole,
  isCurrentAdmin,
}: UserRoleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"User" | "TA" | "Teacher">(
    currentRole === "Admin" ? "User" : (currentRole as "User" | "TA" | "Teacher"),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Do not allow changing role of current admin or another admin
  if (isCurrentAdmin || currentRole === "Admin") {
    return null;
  }

  const handleOpen = () => {
    setError(null);
    setSelectedRole(currentRole);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (selectedRole === currentRole) {
      setIsOpen(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", String(userId));
      fd.append("role", selectedRole);

      const res = await setUserRoleAction({}, fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary-soft/40 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        title="Thay đổi vai trò người dùng"
      >
        Phân quyền
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !pending && setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 text-left shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-semibold text-fg">Phân quyền người dùng</h3>

            <div className="mt-3 rounded-lg border border-line bg-muted/40 p-3 text-xs leading-relaxed">
              <div className="text-fg-muted">Tài khoản được phân quyền:</div>
              <div className="mt-1 font-semibold text-sm text-fg">
                {fullName}{" "}
                <span className="font-mono text-xs font-normal text-fg-muted">(@{username})</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-fg-muted">
                Chọn vai trò mới cho người dùng:
              </label>
              <div className="mt-2 space-y-2">
                {ROLES.map((r) => {
                  const isChecked = selectedRole === r.role;
                  const isCurrent = currentRole === r.role;

                  return (
                    <label
                      key={r.role}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isChecked
                          ? "border-primary bg-primary-soft/20 ring-1 ring-primary"
                          : "border-line bg-surface hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="userRole"
                        value={r.role}
                        checked={isChecked}
                        onChange={() => setSelectedRole(r.role)}
                        disabled={pending}
                        className="mt-0.5 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-fg">{r.label}</span>
                          {isCurrent && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                              Hiện tại
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-fg-muted">{r.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-bad/30 bg-bad-soft p-3 text-xs text-bad">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-sm font-medium text-fg hover:bg-line transition disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={pending || selectedRole === currentRole}
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Đang cập nhật..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
