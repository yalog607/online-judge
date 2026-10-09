import Link from "next/link";
import { Logo } from "@/components/logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg bg-[radial-gradient(60%_45%_at_50%_0,var(--primary-soft),transparent_72%)] px-4">
      <div className="w-full max-w-[440px] card rounded-2xl p-10 shadow-pop">
        <Logo className="mb-5 justify-center" />
        <h1 className="text-center text-2xl font-semibold">Quên mật khẩu</h1>
        <p className="mt-2 text-center text-fg-muted">Khôi phục qua mã xác nhận gửi về email</p>
        <ForgotPasswordForm />
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="text-fg-muted underline">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
