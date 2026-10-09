import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { ApprovalButtons, ClassApprovalButtons } from "./action-buttons";

export const metadata = { title: "Duyệt yêu cầu" };

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const admin = await requireRole("Admin");
  
  const sp = await searchParams;
  const tab = sp.tab === "class" ? "class" : "ta";

  const taRequests = await classRepository.listTARequests(admin.userId);
  const classRequests = await classRepository.listClassRequests();

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Duyệt yêu cầu</h1>
        <p className="mt-1 text-fg-muted">Quản lý các yêu cầu từ Giáo viên và Trợ giảng.</p>
      </div>

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-fg-muted">
                <th className="px-5 py-3">Lớp học</th>
                <th className="px-5 py-3">Học sinh (đề cử)</th>
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
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                    Chưa có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'class' && (
        <div className="card">
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
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-fg-muted">
                    Chưa có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
