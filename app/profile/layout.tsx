import { requireUser } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  
  let nav: NavItem[];
  let roleLabel = "Học viên";
  if (user.role === "Admin") {
    roleLabel = "Quản trị";
    nav = [
      { href: "/admin", label: "Tổng quan", icon: "home" },
      { href: "/admin/approvals", label: "Duyệt Yêu Cầu TA", icon: "shield" },
      { href: "/profile", label: "Hồ sơ", icon: "user" },
    ];
  } else if (user.role === "Teacher") {
    roleLabel = "Giảng viên";
    nav = [
      { href: "/teacher", label: "Tổng quan", icon: "home" },
      { href: "/teacher/problems", label: "Bài tập", icon: "code" },
      { href: "/teacher/classes", label: "Lớp học", icon: "users" },
      { href: "/teacher/contests", label: "Kỳ thi", icon: "trophy" },
      { href: "/profile", label: "Hồ sơ", icon: "user" },
    ];
  } else {
    if (user.role === "TA") roleLabel = "Trợ giảng";
    nav = [
      { href: "/user", label: "Tổng quan", icon: "home" },
      { href: "/user/problems", label: "Bài tập", icon: "code" },
      { href: "/user/classes", label: "Lớp học", icon: "users" },
      { href: "/user/contests", label: "Kỳ thi", icon: "trophy" },
      { href: "/profile", label: "Hồ sơ", icon: "user" },
    ];
  }

  return (
    <AppShell
      roleLabel={roleLabel}
      fullName={user.fullName}
      avatar={user.avatar}
      nav={nav}
      impersonating={Boolean(user.actorId)}
    >
      <div className="w-full max-w-6xl p-6 md:p-8">
        {children}
      </div>
    </AppShell>
  );
}
