import { requireUser } from "@/lib/dal";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hồ sơ cá nhân</h1>
      <div className="card rounded-2xl p-6">
        <h2 className="font-semibold">Thông tin cá nhân</h2>
        <ProfileForm fullName={user.fullName} />
      </div>
      <div className="card rounded-2xl p-6">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
