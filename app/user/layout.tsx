import { requireRole } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/user", label: "Tổng quan" },
  { href: "/user/problems", label: "Bài tập" },
  { href: "/user/classes", label: "Lớp học" },
  { href: "/user/contests", label: "Kỳ thi" },
  { href: "/profile", label: "Hồ sơ" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  
  const nav = [...NAV];
  let roleLabel = "Học viên";
  if (user.role === "TA") roleLabel = "Trợ giảng";
  if (user.role === "Admin") roleLabel = "Quản trị viên";
  if (user.role === "Teacher") roleLabel = "Giảng viên";

  return (
    <AppShell
      roleLabel={roleLabel}
      fullName={user.fullName}
      nav={nav}
      impersonating={Boolean(user.actorId)}
    >
      {children}
    </AppShell>
  );
}
