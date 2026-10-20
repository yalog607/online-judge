import type { NavItem } from "@/components/app-shell";

export const USER_NAV: NavItem[] = [
  { href: "/user", label: "Tổng quan", icon: "home" },
  { href: "/user/notifications", label: "Thông báo", icon: "bell", unreadBadge: true },
  { href: "/user/problems", label: "Bài tập", icon: "code" },
  { href: "/user/classes", label: "Lớp học", icon: "users" },
  { href: "/user/contests", label: "Kỳ thi", icon: "trophy" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];

export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Tổng quan", icon: "home" },
  { href: "/teacher/notifications", label: "Thông báo", icon: "bell", unreadBadge: true },
  { href: "/teacher/problems", label: "Ngân hàng bài tập", icon: "code" },
  { href: "/teacher/classes", label: "Lớp học", icon: "users" },
  { href: "/teacher/contests", label: "Kỳ thi", icon: "trophy" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "home" },
  { href: "/admin/notifications", label: "Thông báo", icon: "bell", unreadBadge: true },
  { href: "/admin/users", label: "Người dùng", icon: "users" },
  { href: "/admin/problems", label: "Bài tập", icon: "code" },
  { href: "/admin/classes", label: "Lớp học", icon: "users" },
  { href: "/admin/contests", label: "Kỳ thi", icon: "trophy" },
  { href: "/admin/approvals", label: "Duyệt Yêu Cầu", icon: "shield" },
  { href: "/admin/reports", label: "Báo cáo thống kê", icon: "chart" },
  { href: "/profile", label: "Hồ sơ", icon: "user" },
];

export function getNavForRole(role: string): NavItem[] {
  if (role === "Admin") return ADMIN_NAV;
  if (role === "Teacher") return TEACHER_NAV;
  return USER_NAV;
}

export function getRoleLabel(role: string): string {
  if (role === "Admin") return "Quản trị";
  if (role === "Teacher") return "Giảng viên";
  if (role === "TA") return "Trợ giảng";
  return "Học viên";
}

export function getNotificationsHref(role: string): string {
  if (role === "Admin") return "/admin/notifications";
  if (role === "Teacher") return "/teacher/notifications";
  return "/user/notifications";
}
