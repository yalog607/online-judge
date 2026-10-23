import { requireRole } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { ADMIN_NAV, getRoleLabel } from "@/lib/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("Admin");
  return (
    <AppShell
      roleLabel={getRoleLabel(user.role)}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={ADMIN_NAV}
      notificationsHref="/admin/notifications"
    >
      {children}
    </AppShell>
  );
}
