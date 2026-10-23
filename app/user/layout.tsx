import { requireRole } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { getNavForRole, getNotificationsHref, getRoleLabel } from "@/lib/nav";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("User", "TA", "Teacher", "Admin");

  return (
    <AppShell
      roleLabel={getRoleLabel(user.role)}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={getNavForRole(user.role)}
      notificationsHref={getNotificationsHref(user.role)}
    >
      {children}
    </AppShell>
  );
}
