import { requireRole } from "@/lib/dal";
import { listUsersForAdmin } from "@/modules/auth/service";
import { AdminUsersManager } from "./admin-users-manager";
import type { Role } from "@/lib/session";

export const metadata = { title: "Quản lý người dùng - ITOJ Admin" };

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

  return (
    <AdminUsersManager
      users={items}
      total={total}
      page={page}
      pageSize={pageSize}
      currentAdminId={admin.userId}
      query={q}
      roleFilter={role}
      statusFilter={status}
    />
  );
}
