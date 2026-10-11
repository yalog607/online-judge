"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pager } from "@/components/pager";
import {
  setUserStatusAction,
  setUserRoleAction,
  impersonateAction,
} from "@/modules/auth/actions";
import type { Role } from "@/lib/session";

export type AdminUserRow = {
  UserID: number;
  Username: string;
  Email: string;
  FullName: string;
  Role: Role;
  Status: "Active" | "Locked";
  CreatedAt: string | Date;
  Avatar?: string | null;
};

type AdminUsersManagerProps = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  currentAdminId: number;
  query: string;
  roleFilter?: string;
  statusFilter?: string;
};

const AVATAR_COLORS = [
  "bg-purple-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-sky-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
];

export function AdminUsersManager({
  users,
  total,
  page,
  pageSize,
  currentAdminId,
  query,
  roleFilter,
  statusFilter,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    users[0]?.UserID ?? null
  );

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<Role>("User");

  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedUser = users.find((u) => u.UserID === selectedUserId) ?? null;
  const isCurrentAdmin = selectedUser?.UserID === currentAdminId;

  const canLock = Boolean(selectedUser && !isCurrentAdmin && selectedUser.Status === "Active");
  const canUnlock = Boolean(selectedUser && !isCurrentAdmin && selectedUser.Status === "Locked");
  const canImpersonate = Boolean(
    selectedUser &&
      !isCurrentAdmin &&
      selectedUser.Role !== "Admin" &&
      selectedUser.Status === "Active"
  );
  const canChangeRole = Boolean(selectedUser && !isCurrentAdmin);

  const handleStatusChange = (nextStatus: "Active" | "Locked") => {
    if (!selectedUser) return;
    setModalError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", String(selectedUser.UserID));
      fd.append("status", nextStatus);
      const res = await setUserStatusAction({}, fd);
      if (res?.error) {
        setModalError(res.error);
      } else {
        setIsLockModalOpen(false);
        setIsUnlockModalOpen(false);
        router.refresh();
      }
    });
  };

  const handleRoleChange = () => {
    if (!selectedUser) return;
    setModalError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", String(selectedUser.UserID));
      fd.append("role", selectedNewRole);
      const res = await setUserRoleAction({}, fd);
      if (res?.error) {
        setModalError(res.error);
      } else {
        setIsRoleModalOpen(false);
        router.refresh();
      }
    });
  };

  const handleImpersonate = () => {
    if (!selectedUser) return;
    setModalError(null);
    startTransition(async () => {
      try {
        await impersonateAction(selectedUser.UserID);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "digest" in err) {
          throw err;
        }
        setModalError(err instanceof Error ? err.message : "Mô phỏng thất bại.");
      }
    });
  };

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(targetPage));
    return `/admin/users?${params.toString()}`;
  };

  const fromCount = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toCount = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Khóa, mở khóa hoặc mô phỏng tài khoản.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form method="get" action="/admin/users" className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[260px] flex-1 sm:max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Tìm theo tên đăng nhập hoặc email..."
                className="w-full rounded-lg border border-line bg-muted/50 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:bg-surface focus:outline-none"
              />
            </div>

            <select
              name="role"
              defaultValue={roleFilter ?? ""}
              onChange={(e) => e.target.form?.requestSubmit()}
              className="rounded-lg border border-line bg-muted/50 px-3 py-2 text-sm text-fg focus:border-primary focus:bg-surface focus:outline-none"
            >
              <option value="">Vai trò (Tất cả)</option>
              <option value="User">User</option>
              <option value="Teacher">Teacher</option>
              <option value="TA">TA</option>
              <option value="Admin">Admin</option>
            </select>

            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition"
            >
              Tìm
            </button>

            {(query || roleFilter || statusFilter) && (
              <Link
                href="/admin/users"
                className="shrink-0 rounded-lg border border-line bg-muted px-3 py-2 text-sm font-medium text-fg hover:bg-line transition"
              >
                Xóa lọc
              </Link>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canLock}
              onClick={() => {
                setModalError(null);
                setIsLockModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:text-rose-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Khóa tài khoản
            </button>

            <button
              type="button"
              disabled={!canUnlock}
              onClick={() => {
                setModalError(null);
                setIsUnlockModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Mở khóa
            </button>

            {canChangeRole && (
              <button
                type="button"
                onClick={() => {
                  if (selectedUser) {
                    setSelectedNewRole(selectedUser.Role);
                    setModalError(null);
                    setIsRoleModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Phân quyền
              </button>
            )}

            <button
              type="button"
              disabled={!canImpersonate}
              onClick={() => {
                setModalError(null);
                setIsImpersonateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Mô phỏng
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-line bg-muted/40 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <th className="w-12 px-4 py-3.5 text-center"></th>
                <th className="w-[30%] min-w-[200px] px-4 py-3.5 text-left">Người dùng</th>
                <th className="w-[28%] min-w-[180px] px-4 py-3.5 text-left">Email</th>
                <th className="w-[18%] min-w-[110px] px-4 py-3.5 text-center">Vai trò</th>
                <th className="w-[18%] min-w-[110px] px-4 py-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const isSelected = selectedUserId === u.UserID;
                const isUserCurrentAdmin = u.UserID === currentAdminId;
                const initial = u.FullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
                const avatarColor = AVATAR_COLORS[u.UserID % AVATAR_COLORS.length];

                return (
                  <tr
                    key={u.UserID}
                    onClick={() => setSelectedUserId(u.UserID)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-500/10 dark:bg-blue-950/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected
                              ? "border-blue-600 bg-surface"
                              : "border-line hover:border-fg-muted"
                          }`}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.Avatar ? (
                          <Image
                            src={u.Avatar}
                            alt={u.FullName}
                            width={36}
                            height={36}
                            unoptimized
                            className="h-9 w-9 flex-none rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
                          >
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-fg truncate flex items-center gap-1.5">
                            <span className="truncate">{u.FullName}</span>
                            {isUserCurrentAdmin && (
                              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-fg-muted truncate">
                            {u.Username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-fg-muted truncate">
                      {u.Email}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {u.Role === "User" && (
                        <span className="inline-block rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                          User
                        </span>
                      )}
                      {u.Role === "Teacher" && (
                        <span className="inline-block rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Teacher
                        </span>
                      )}
                      {u.Role === "Admin" && (
                        <span className="inline-block rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                          Admin
                        </span>
                      )}
                      {u.Role === "TA" && (
                        <span className="inline-block rounded-md border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                          TA
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {u.Status === "Active" ? (
                        <span className="inline-block rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-fg-muted">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-fg-muted">
          <div>
            Hiển thị {fromCount} - {toCount} trong tổng số {total.toLocaleString("vi-VN")}
          </div>
          {total > 0 && (
            <Pager
              page={page}
              pageSize={pageSize}
              total={total}
              buildHref={buildPageHref}
            />
          )}
        </div>
      </div>

      {isImpersonateModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-fg">Xác nhận mô phỏng tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImpersonateModalOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-3 text-sm text-fg-muted">
              <p>
                Bạn sắp chuyển sang phiên làm việc của người dùng{" "}
                <strong className="text-fg font-semibold">{selectedUser.FullName}</strong>{" "}
                <span className="font-mono text-xs text-fg-muted">(@{selectedUser.Username})</span> với vai trò{" "}
                <strong className="text-fg font-semibold">{selectedUser.Role}</strong>.
              </p>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-300">
                Lưu ý: Mọi thao tác thực hiện trong phiên mô phỏng sẽ mang danh nghĩa của tài khoản này và được lưu vào nhật ký kiểm toán. Bạn có thể quay lại phiên Admin bất kỳ lúc nào qua thanh cảnh báo ở đầu trang.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsImpersonateModalOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleImpersonate}
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang xử lý..." : "Bắt đầu mô phỏng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLockModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-fg">Xác nhận khóa tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm text-fg-muted">
              <p>
                Bạn có chắc chắn muốn khóa tài khoản của{" "}
                <strong className="text-fg font-semibold">{selectedUser.FullName}</strong>{" "}
                <span className="font-mono text-xs text-fg-muted">(@{selectedUser.Username})</span>?
              </p>
              <p className="text-xs text-fg-subtle">
                Người dùng sẽ bị thu hồi toàn bộ phiên hoạt động ngay lập tức và không thể đăng nhập vào hệ thống.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("Locked")}
                disabled={isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUnlockModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-fg">Xác nhận mở khóa tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm text-fg-muted">
              <p>
                Bạn có chắc chắn muốn mở khóa tài khoản của{" "}
                <strong className="text-fg font-semibold">{selectedUser.FullName}</strong>{" "}
                <span className="font-mono text-xs text-fg-muted">(@{selectedUser.Username})</span>?
              </p>
              <p className="text-xs text-fg-subtle">
                Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường trở lại.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("Active")}
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-fg font-semibold">
                <svg className="h-5 w-5 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-fg">Phân quyền tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-fg-muted hover:text-fg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-3 text-sm text-fg-muted">
              <p>
                Chọn vai trò mới cho{" "}
                <strong className="text-fg font-semibold">{selectedUser.FullName}</strong>{" "}
                <span className="font-mono text-xs text-fg-muted">(@{selectedUser.Username})</span>:
              </p>

              <div className="space-y-2">
                {(["User", "Teacher", "TA", "Admin"] as Role[]).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition ${
                      selectedNewRole === r
                        ? "border-primary bg-primary/5 text-fg"
                        : "border-line bg-surface text-fg-muted hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="new_role"
                        value={r}
                        checked={selectedNewRole === r}
                        onChange={() => setSelectedNewRole(r)}
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium text-fg">{r}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-line bg-muted px-4 py-2 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRoleChange}
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
