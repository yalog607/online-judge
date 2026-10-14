import { requireRole } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { TEACHER_NAV, getRoleLabel } from "@/lib/nav";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("Teacher");
  return (
    <AppShell
      roleLabel={getRoleLabel(user.role)}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={TEACHER_NAV}
      impersonating={Boolean(user.actorId)}
      notificationsHref="/teacher/notifications"
    >
      {children}
    </AppShell>
  );
}
