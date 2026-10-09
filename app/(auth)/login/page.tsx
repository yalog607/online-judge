import { redirectIfSignedIn } from "@/lib/dal";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  await redirectIfSignedIn();
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg bg-[radial-gradient(60%_45%_at_50%_0,var(--primary-soft),transparent_72%)] px-4">
      <div className="w-full max-w-[440px] card rounded-2xl p-10 shadow-pop">
        <Logo className="mb-5 justify-center" />
        <h1 className="text-center text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-2 text-center text-fg-muted">Chào mừng bạn quay trở lại</p>
        <LoginForm />
        <p className="mt-5 text-center text-sm text-fg-muted">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-fg underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  );
}
