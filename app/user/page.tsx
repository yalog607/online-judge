import { requireUser } from "@/lib/dal";
import { getRoleLabel } from "@/lib/nav";
import { Welcome } from "@/components/welcome";

export const metadata = { title: "Trang chủ - ITOJ" };

export default async function UserHome() {
  const user = await requireUser();
  return <Welcome fullName={user.fullName} roleLabel={getRoleLabel(user.role)} />;
}
