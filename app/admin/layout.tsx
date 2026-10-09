import { requireRole } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "home" },
  { href: "/admin/approvals", label: "Duyệt Yêu Cầu TA", icon: "shield" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("Admin");
  return (
    <AppShell
      roleLabel="Quản trị"
      fullName={user.fullName}
      nav={NAV}
      impersonating={Boolean(user.actorId)}
    >
      {children}
    </AppShell>
  );
}
