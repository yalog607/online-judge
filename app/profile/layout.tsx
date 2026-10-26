import { requireUser } from "@/lib/dal";
import { AppShell } from "@/components/app-shell";
import { getNavForRole, getRoleLabel } from "@/lib/nav";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = getNavForRole(user.role);
  const roleLabel = getRoleLabel(user.role);

  return (
    <AppShell
      roleLabel={roleLabel}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={nav}
    >
      <div className="w-full max-w-6xl p-6 md:p-8">
        {children}
      </div>
    </AppShell>
  );
}
