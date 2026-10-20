import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { paginate, parsePage } from "@/lib/paginate";
import { ApprovalButtons, ClassApprovalButtons } from "./action-buttons";

export const metadata = { title: "Duyệt yêu cầu" };

const PAGE_SIZE = 20;

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await requireRole("Admin");
  
  const sp = await searchParams;
  const tab = sp.tab === "class" ? "class" : "ta";

  const allTaRequests = await classRepository.listTARequests(admin.userId);
  const allClassRequests = await classRepository.listClassRequests();
  const current = paginate<unknown>(
    tab === "class" ? allClassRequests : allTaRequests,
    parsePage(sp.page),
    PAGE_SIZE,
  ) as { items: any[]; page: number; total: number }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const taRequests = tab === "ta" ? current.items : [];
  const classRequests = tab === "class" ? current.items : [];
  const buildHref = (p: number) => `/admin/approvals?${tab === "class" ? "tab=class&" : ""}page=${p}`;

  return (
    <div className="flex flex-col gap-5 pt-8">
      <PageHeader title="Duyệt yêu cầu" description="Quản lý các yêu cầu từ Giáo viên và Trợ giảng." />

      <div className="flex gap-4 border-b border-line pb-2">
        <Link 
          href="/admin/approvals" 
          className={`font-medium pb-2 -mb-[9px] ${tab === 'ta' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Yêu cầu trợ giảng
        </Link>
        <Link 
          href="/admin/approvals?tab=class" 
          className={`font-medium pb-2 -mb-[9px] ${tab === 'class' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Yêu cầu tạo lớp
        </Link>
      </div>

      {tab === 'ta' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-fg-muted">
                <th className="px-5 py-3">Lớp học</th>
                <th className="px-5 py-3">Học viên (đề cử)</th>
                <th className="px-5 py-3">Giáo viên (người gửi)</th>
                <th className="px-5 py-3">Ngày gửi</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {taRequests.map((r: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={r.RequestID} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium">{r.ClassName}</td>
                  <td className="px-5 py-3">{r.StudentName}</td>
                  <td className="px-5 py-3">{r.TeacherName}</td>
                  <td className="px-5 py-3 text-fg-muted">
                    {new Date(r.RequestDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-5 py-3">
                    {r.Status === "Pending" ? (
                      <span className="text-warn font-medium">Chờ duyệt</span>
                    ) : r.Status === "Approved" ? (
                      <span className="text-ok font-medium">Đã duyệt</span>
                    ) : (
                      <span className="text-bad font-medium">Từ chối</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.Status === "Pending" ? (
                      <ApprovalButtons requestId={r.RequestID} />
                    ) : (
                      <span className="text-fg-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {taRequests.length === 0 && (
                <EmptyState variant="cell" colSpan={6}>Chưa có yêu cầu nào.</EmptyState>
              )}
            </tbody>
          </table>
          </div>
          <Pager page={current.page} pageSize={PAGE_SIZE} total={current.total} buildHref={buildHref} />
        </div>
      )}

      {tab === 'class' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-fg-muted">
                <th className="px-5 py-3">Lớp học</th>
                <th className="px-5 py-3">Giáo viên (người gửi)</th>
                <th className="px-5 py-3">Ngày gửi</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classRequests.map((r: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                <tr key={r.ClassID} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium">{r.ClassName}</td>
                  <td className="px-5 py-3">{r.TeacherName}</td>
                  <td className="px-5 py-3 text-fg-muted">
                    {new Date(r.CreatedAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-5 py-3">
                    {r.ApprovalStatus === "Pending" ? (
                      <span className="text-warn font-medium">Chờ duyệt</span>
                    ) : r.ApprovalStatus === "Approved" ? (
                      <span className="text-ok font-medium">Đã duyệt</span>
                    ) : (
                      <span className="text-bad font-medium">Từ chối</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.ApprovalStatus === "Pending" ? (
                      <ClassApprovalButtons classId={r.ClassID} />
                    ) : (
                      <span className="text-fg-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {classRequests.length === 0 && (
                <EmptyState variant="cell" colSpan={5}>Chưa có yêu cầu nào.</EmptyState>
              )}
            </tbody>
          </table>
          </div>
          <Pager page={current.page} pageSize={PAGE_SIZE} total={current.total} buildHref={buildHref} />
        </div>
      )}
    </div>
  );
}
