import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { AddStudentForm } from "./add-student-form";
import { RemoveStudentButton } from "./remove-student-button";

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const classId = parseInt(id, 10);
  if (isNaN(classId)) notFound();

  const classDetail = await classRepository.getClassDetail(classId, actor.userId);
  if (!classDetail) notFound();

  const students = await classRepository.getClassStudents(classId, actor.userId);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/teacher/classes"
            className="text-sm font-medium text-fg-muted hover:text-fg hover:underline"
          >
            ← Quay lại danh sách lớp
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{classDetail.ClassName}</h1>
          <p className="mt-1 text-fg-muted">
            {classDetail.Description || "Chưa có mô tả cho lớp học này."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Mã mời tham gia
          </span>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-primary">
              {classDetail.InviteCode}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Tổng số học sinh
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{students.length} học sinh</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Ngày thành lập
          </span>
          <p className="mt-2 text-xl font-bold text-fg">
            {new Date(classDetail.CreatedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Thêm học sinh vào lớp</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Nhập địa chỉ email hoặc tên đăng nhập của học sinh để thêm trực tiếp vào lớp.
        </p>
        <AddStudentForm classId={classId} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách học sinh ({students.length})</h2>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted font-medium text-fg-muted">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Tên đăng nhập</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ngày tham gia</th>
                <th className="px-4 py-3 text-center">Tiến độ</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    Chưa có học sinh nào tham gia lớp học này.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.UserID} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-fg-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-fg">{s.FullName}</td>
                    <td className="px-4 py-3 font-mono text-fg-muted">{s.Username}</td>
                    <td className="px-4 py-3 text-fg-muted">{s.Email}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Date(s.JoinDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-ok">
                      {s.ProgressPercent}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveStudentButton
                        classId={classId}
                        studentId={s.UserID}
                        studentName={s.FullName}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
