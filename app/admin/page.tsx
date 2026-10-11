import Link from "next/link";
import { Icon } from "@/components/icon";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Tổng quan Quản trị</h1>
        <p className="mt-1 text-fg-muted">
          Trung tâm điều hành và kiểm soát tài khoản, phê duyệt trong hệ thống ITOJ.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/users"
          className="card group flex flex-col justify-between p-5 transition hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-fg">
              <Icon name="users" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-fg">Quản lý người dùng</h2>
              <p className="text-xs text-fg-muted">Tìm kiếm, lọc vai trò & khóa/mở khóa</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-primary">
            <span>Truy cập danh sách</span>
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </Link>

        <Link
          href="/admin/approvals"
          className="card group flex flex-col justify-between p-5 transition hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-warn-soft text-warn transition group-hover:bg-warn group-hover:text-white">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-fg">Duyệt yêu cầu</h2>
              <p className="text-xs text-fg-muted">Yêu cầu trợ giảng & đăng ký tạo lớp</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-primary">
            <span>Xem yêu cầu</span>
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="card group flex flex-col justify-between p-5 transition hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ok-soft text-ok transition group-hover:bg-ok group-hover:text-white">
              <Icon name="chart" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-fg">Báo cáo thống kê</h2>
              <p className="text-xs text-fg-muted">Tỉ lệ đạt/trượt & xuất file Excel .xlsx</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-primary">
            <span>Xem báo cáo</span>
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

