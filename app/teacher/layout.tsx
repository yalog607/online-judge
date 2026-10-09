import { requireRole } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/teacher", label: "Tổng quan", icon: "home" },
  { href: "/teacher/problems", label: "Bài tập", icon: "code" },
  { href: "/teacher/classes", label: "Lớp học", icon: "users" },
  { href: "/teacher/contests", label: "Kỳ thi", icon: "trophy" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("Teacher", "Admin");
  return (
    <AppShell
      roleLabel={user.role === "Admin" ? "Quản trị" : "Giảng viên"}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={NAV}
      impersonating={Boolean(user.actorId)}
    >
      {children}
    </AppShell>
  );
}
