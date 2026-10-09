import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { listForManage as listProblemsForManage } from "@/modules/problem/repo";
import { ApprovalButtons, ProblemApprovalButtons } from "./action-buttons";

export const metadata = { title: "Duyệt yêu cầu" };

export default async function AdminApprovalsPage() {
  const admin = await requireRole("Admin");
  
  const requests = await classRepository.listTARequests(admin.userId);
  const pendingProblems = await listProblemsForManage({
    actorId: admin.userId,
    status: "Pending",
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Duyệt yêu cầu</h1>
        <p className="mt-1 text-fg-muted">Quản lý các yêu cầu thăng cấp Trợ giảng.</p>
      </div>

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
            {requests.map((r: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
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
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                  Chưa có yêu cầu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Duyệt bài tập (Từ Trợ giảng)</h2>
        <p className="mt-1 mb-4 text-sm text-fg-muted">Bài tập do Trợ giảng tạo cần được duyệt trước khi public.</p>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fg-muted">
              <th className="px-5 py-3">Bài tập</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pendingProblems.rows.map((p) => (
              <tr key={p.ProblemID} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-medium">
                  <a href={`/user/problems/${p.ProblemID}`} target="_blank" className="hover:underline">{p.Title}</a>
                </td>
                <td className="px-5 py-3 text-fg-muted">{p.Tags}</td>
                <td className="px-5 py-3">{p.Difficulty}</td>
                <td className="px-5 py-3 flex justify-end">
                  <ProblemApprovalButtons problemId={p.ProblemID} />
                </td>
              </tr>
            ))}
            {pendingProblems.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-fg-muted">
                  Không có bài tập nào chờ duyệt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
