import { requireUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { getNavForRole, getNotificationsHref, getRoleLabel } from "@/lib/nav";

export default async function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
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
