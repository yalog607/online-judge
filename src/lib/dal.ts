import "server-only";
import { cache } from "react";
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

export async function requireUser(): Promise<CurrentUser> {
  const user = await verifySession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}
