import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { Badge, ClassActiveBadge, DifficultyBadge } from "@/components/badge";

export default async function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("Admin");
  const classId = Number((await params).id);
  if (!Number.isInteger(classId) || classId <= 0) notFound();

  const detail = await classRepository.getTeacherClassView(classId, actor.userId);
  // Lớp chưa được duyệt không xuất hiện ngoài trang duyệt yêu cầu.
  if (!detail || detail.ApprovalStatus !== "Approved") notFound();

  const [students, problems] = await Promise.all([
    classRepository.getClassStudents(classId, actor.userId),
    classRepository.getClassProblems(classId, actor.userId),
  ]);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <Link href="/admin/classes" className="text-sm font-medium text-fg-muted hover:text-fg hover:underline">
        ← Quay lại danh sách lớp
      </Link>
      <PageHeader
        title={detail.ClassName}
        badge={
          <span className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
              Chỉ xem
            </span>
            <ClassActiveBadge cancelled={detail.IsCancelled} />
            <Badge kind={detail.IsPublic ? "ok" : "warn"}>{detail.IsPublic ? "Công khai" : "Cần duyệt"}</Badge>
          </span>
        }
        description={detail.Description || "Chưa có mô tả cho lớp học này."}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Giảng viên", detail.TeacherName],
          ["Mã mời", detail.InviteCode ?? "—"],
          ["Số học viên", String(students.length)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-sm text-fg-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Học viên</h2>
        <DataTable
          columns={[
            { label: "Họ tên" },
            { label: "Email" },
            { label: "Ngày tham gia" },
            { label: "Tiến độ", align: "right" },
          ]}
        >
          {students.length === 0 ? (
            <EmptyState variant="cell" colSpan={4}>
              Lớp chưa có học viên.
            </EmptyState>
          ) : (
            students.map((s) => (
              <tr key={s.UserID} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-fg">{s.FullName}</span>{" "}
                  <span className="text-xs text-fg-muted">@{s.Username}</span>{" "}
                  {Boolean(s.IsTA) && <Badge kind="info">Trợ giảng</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted">{s.Email}</td>
                <td className="px-4 py-3 text-xs text-fg-muted">
                  {new Date(s.JoinDate).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3 text-right text-xs text-fg-muted">{s.ProgressPercent}%</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Bài tập của lớp</h2>
        <DataTable columns={[{ label: "Bài tập" }, { label: "Độ khó" }, { label: "Hạn nộp", align: "right" }]}>
          {problems.length === 0 ? (
            <EmptyState variant="cell" colSpan={3}>
              Lớp chưa được giao bài tập nào.
            </EmptyState>
          ) : (
            problems.map((p) => (
              <tr key={p.ProblemID} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 font-medium text-fg">
                  <Link href={`/admin/problems/${p.ProblemID}`} className="hover:underline">
                    {p.Title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <DifficultyBadge value={p.Difficulty} />
                </td>
                <td className="px-4 py-3 text-right text-xs text-fg-muted">
                  {p.DueDate ? new Date(p.DueDate).toLocaleDateString("vi-VN") : "—"}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </div>
  );
}
