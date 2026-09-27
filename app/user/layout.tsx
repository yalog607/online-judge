import { requireRole } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/user", label: "Tổng quan" },
  { href: "/profile", label: "Hồ sơ" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("User");
  return (
    <AppShell
      roleLabel="Học viên"
      fullName={user.fullName}
      nav={NAV}
      impersonating={Boolean(user.actorId)}
    >
      {children}
    </AppShell>
  );
}
