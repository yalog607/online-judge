import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/dal";
import { listUsersForAdmin } from "@/modules/auth/service";
import { Badge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { UserStatusButton } from "./user-status-modal";
import { UserRoleButton } from "./user-role-modal";
import type { Role } from "@/lib/session";

export const metadata = { title: "Quản lý người dùng - ITOJ Admin" };

const ROLE_LABELS: Record<Role, { label: string; kind: "info" | "warn" | "neutral" }> = {
  Admin: { label: "Admin", kind: "info" },
  Teacher: { label: "Giáo viên", kind: "info" },
  TA: { label: "Trợ giảng", kind: "warn" },
  User: { label: "Học viên", kind: "neutral" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await requireRole("Admin");
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const roleParam = typeof sp.role === "string" ? sp.role : undefined;
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSize = 20;

  const validRoles: Role[] = ["User", "Teacher", "Admin", "TA"];
  const role = validRoles.includes(roleParam as Role) ? (roleParam as Role) : undefined;

  const validStatuses: ("Active" | "Locked")[] = ["Active", "Locked"];
  const status = validStatuses.includes(statusParam as "Active" | "Locked")
    ? (statusParam as "Active" | "Locked")
    : undefined;

  const { items, total } = await listUsersForAdmin({
    actorId: admin.userId,
    search: q || undefined,
    role,
    status,
    page,
    pageSize,
  });

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    params.set("page", String(targetPage));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
          <p className="mt-1 text-fg-muted text-sm">
            Tra cứu tài khoản, phân quyền và khóa/mở khóa truy cập trong hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-surface border border-line px-3 py-1.5 text-xs font-medium text-fg-muted shadow-xs">
            Tổng cộng: <strong className="text-fg">{total}</strong> tài khoản
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form
        key={new URLSearchParams(sp as Record<string, string>).toString()}
        className="card flex flex-wrap items-center gap-2.5 p-3"
        method="get"
      >
        <div className="w-full sm:w-72 md:w-80">
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên, email, username..."
            className="w-full rounded-lg border border-line bg-muted px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none"
          />
        </div>

        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Vai trò: Tất cả</option>
          <option value="User">Học viên (User)</option>
          <option value="Teacher">Giáo viên (Teacher)</option>
          <option value="TA">Trợ giảng (TA)</option>
          <option value="Admin">Quản trị viên (Admin)</option>
        </select>

        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Trạng thái: Tất cả</option>
          <option value="Active">Đang hoạt động</option>
          <option value="Locked">Đã khóa</option>
        </select>

        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90"
        >
          Tìm kiếm
        </button>

        {(q || role || status) && (
          <Link
            href="/admin/users"
            className="shrink-0 rounded-lg border border-line bg-muted px-4 py-2 text-sm font-medium text-fg transition hover:bg-line"
          >
            Xóa lọc
          </Link>
        )}
      </form>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-line bg-muted/40 text-xs font-semibold text-fg-muted uppercase tracking-wider">
                <th className="w-[20%] min-w-[170px] px-4 py-3.5 text-left">Người dùng</th>
                <th className="w-[13%] min-w-[110px] px-4 py-3.5 text-left">Tên đăng nhập</th>
                <th className="w-[20%] min-w-[170px] px-4 py-3.5 text-left">Email</th>
                <th className="w-[9%] min-w-[85px] px-3 py-3.5 text-center">Vai trò</th>
                <th className="w-[11%] min-w-[105px] px-3 py-3.5 text-center">Trạng thái</th>
                <th className="w-[10%] min-w-[90px] px-3 py-3.5 text-center">Ngày tạo</th>
                <th className="w-[17%] min-w-[160px] px-3 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((u) => {
                const initial = u.FullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";
                const roleMeta = ROLE_LABELS[u.Role] ?? { label: u.Role, kind: "neutral" };
                const isCurrent = admin.userId === u.UserID;

                return (
                  <tr
                    key={u.UserID}
                    className={`transition-colors hover:bg-muted/30 ${
                      isCurrent ? "bg-primary-soft/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.Avatar ? (
                          <Image
                            src={u.Avatar}
                            alt={u.FullName}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 flex-none rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-fg truncate flex items-center gap-1.5">
                            <span className="truncate">{u.FullName}</span>
                            {isCurrent && (
                              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-fg-muted truncate">
                      @{u.Username}
                    </td>
                    <td className="px-4 py-3.5 text-fg-muted truncate">{u.Email}</td>
                    <td className="px-3 py-3.5 text-center">
                      <Badge kind={roleMeta.kind}>{roleMeta.label}</Badge>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {u.Status === "Active" ? (
                        <Badge kind="ok">Đang hoạt động</Badge>
                      ) : (
                        <Badge kind="bad">Đã khóa</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-fg-muted text-center whitespace-nowrap">
                      {new Date(u.CreatedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <UserRoleButton
                          userId={u.UserID}
                          fullName={u.FullName}
                          username={u.Username}
                          currentRole={u.Role}
                          isCurrentAdmin={isCurrent}
                        />
                        <UserStatusButton
                          userId={u.UserID}
                          fullName={u.FullName}
                          username={u.Username}
                          status={u.Status}
                          isCurrentAdmin={isCurrent}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-fg-muted">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="border-t border-line px-4 py-2">
            <Pager
              page={page}
              pageSize={pageSize}
              total={total}
              buildHref={buildPageHref}
            />
          </div>
        )}
      </div>
    </div>
  );
}
