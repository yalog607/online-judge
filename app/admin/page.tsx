import { requireRole } from "@/lib/dal";
import { getRoleLabel } from "@/lib/nav";
import { Welcome } from "@/components/welcome";

export const metadata = { title: "Trang chủ - ITOJ Admin" };

export default async function AdminHome() {
  const user = await requireRole("Admin");
  return <Welcome fullName={user.fullName} roleLabel={getRoleLabel(user.role)} />;
}
