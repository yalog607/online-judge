import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { getUserById } from "@/modules/auth/repo";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await getUserById(sessionUser.userId);
  if (!user) notFound();

  let roleLabel = "Học viên";
  if (user.Role === "Admin") roleLabel = "Quản trị viên";
  if (user.Role === "Teacher") roleLabel = "Giảng viên";
  if (user.Role === "TA") roleLabel = "Trợ giảng";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Hồ sơ cá nhân</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Cập nhật họ tên, ảnh đại diện và mật khẩu.
          </p>
        </div>
        <Link
          href="/user"
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-xs"
        >
          <span>📊 Xem báo cáo tiến độ cá nhân →</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card rounded-2xl p-6 border border-line bg-surface shadow-sm">
          <div className="pb-4 border-b border-line">
            <h2 className="text-base font-semibold text-fg">Thông tin</h2>
          </div>
          <ProfileForm
            fullName={user.FullName}
            email={user.Email}
            username={user.Username}
            roleLabel={roleLabel}
            avatar={user.Avatar}
          />
        </div>

        <div className="card rounded-2xl p-6 border border-line bg-surface shadow-sm">
          <div className="pb-4 border-b border-line">
            <h2 className="text-base font-semibold text-fg">Đổi mật khẩu</h2>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
