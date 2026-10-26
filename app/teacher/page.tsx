import { requireRole } from "@/lib/dal";
import { getRoleLabel } from "@/lib/nav";
import { Welcome } from "@/components/welcome";

export const metadata = { title: "Trang chủ - ITOJ Giảng viên" };

export default async function TeacherHome() {
  const user = await requireRole("Teacher");
  return <Welcome fullName={user.fullName} roleLabel={getRoleLabel(user.role)} />;
}
