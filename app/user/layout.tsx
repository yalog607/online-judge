import { requireRole } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { USER_NAV, TEACHER_NAV, getRoleLabel } from "@/lib/nav";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  const nav = (user.role === "Teacher" || user.role === "Admin") ? TEACHER_NAV : USER_NAV;

  return (
    <AppShell
      roleLabel={getRoleLabel(user.role)}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={nav}
      impersonating={Boolean(user.actorId)}
      notificationsHref={user.role === "Teacher" ? "/teacher/notifications" : "/user/notifications"}
    >
      {children}
    </AppShell>
  );
}
