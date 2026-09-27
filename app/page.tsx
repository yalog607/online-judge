import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">ITOJ Online Judge</h1>
      <p className="max-w-md text-fg-muted">
        Nền tảng luyện tập, tổ chức lớp học và kỳ thi lập trình trực tuyến.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-fg px-5 py-2.5 font-medium text-bg hover:opacity-90"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-muted px-5 py-2.5 font-medium text-fg hover:opacity-90"
        >
          Đăng ký
        </Link>
      </div>
    </main>
  );
}
