import { requireRole } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/problems", label: "Bài tập" },
  { href: "/profile", label: "Hồ sơ" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("Teacher", "Admin");
  return (
    <AppShell
      roleLabel={user.role === "Admin" ? "Quản trị" : "Giảng viên"}
      fullName={user.fullName}
      nav={NAV}
      impersonating={Boolean(user.actorId)}
    >
      {children}
    </AppShell>
  );
}
