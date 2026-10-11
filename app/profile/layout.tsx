import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { logoutAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/form";
import { NotificationCenter } from "@/components/notification-center";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const home = user.role === "Admin" ? "/admin" : user.role === "Teacher" ? "/teacher" : "/user";
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <NotificationCenter href={`${home}/notifications`} showBell={false} />
      <div className="flex items-center justify-between">
        <Link href={home} className="text-fg-muted underline">
          ← Về trang chủ
        </Link>
        <form action={logoutAction}>
          <SubmitButton variant="ghost">
            Đăng xuất
          </SubmitButton>
        </form>
      </div>
      {children}
    </div>
  );
}
