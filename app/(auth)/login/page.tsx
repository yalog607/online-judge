import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[440px] rounded-2xl bg-surface p-10">
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
