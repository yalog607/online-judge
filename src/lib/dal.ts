import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, type Role } from "@/lib/session";
import { execProc } from "@/db/exec";

type CurrentUser = {
  userId: number;
  role: Role;
  fullName: string;
  avatar: string | null;
  status: "Active" | "Locked";
  actorId?: number;
};

export const verifySession = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const { rows } = await execProc<{
    UserID: number;
    Role: Role;
    FullName: string;
    Status: "Active" | "Locked";
    Avatar: string | null;
  }>("usp_Session_Validate", { SessionID: session.sessionId });

  const user = rows[0];
  if (!user || user.Status === "Locked") return null;

  return {
    userId: user.UserID,
    role: user.Role,
    fullName: user.FullName,
    avatar: user.Avatar ?? null,
    status: user.Status,
    actorId: session.actorId,
  };
});

export function roleHome(role: Role) {
  if (role === "Admin") return "/admin";
  if (role === "Teacher") return "/teacher";
  if (role === "TA") return "/user";
  return "/user";
}

export async function redirectIfSignedIn() {
  const user = await verifySession();
  if (user) redirect(roleHome(user.role));
}

export const READ_ONLY_PARAM = "mo_phong_chi_xem";

function readOnlyReturnPath(referer: string | null) {
  try {
    const url = new URL(referer ?? "", "http://localhost");
    url.searchParams.set(READ_ONLY_PARAM, "1");
    return `${url.pathname}${url.search}`;
  } catch {
    return `/?${READ_ONLY_PARAM}=1`;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await verifySession();
  if (!user) redirect("/login");
  // Chế độ mô phỏng chỉ để xem: mọi Server Action cần người dùng đều bị chặn. Quay lại đúng trang
  // đang xem kèm cờ để giao diện hiện thông báo (không ném lỗi, tránh hiện trang lỗi).
  if (user.actorId) {
    const h = await headers();
    if (h.has("next-action")) redirect(readOnlyReturnPath(h.get("referer")));
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}
