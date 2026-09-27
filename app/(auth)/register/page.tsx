import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[440px] rounded-2xl bg-surface p-10">
        <h1 className="text-center text-2xl font-semibold">Đăng ký</h1>
        <p className="mt-2 text-center text-fg-muted">Tạo tài khoản để bắt đầu luyện tập</p>
        <RegisterForm />
        <p className="mt-5 text-center text-sm text-fg-muted">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-fg underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
