import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { leaveClassAction } from "@/modules/class/actions";
import { DifficultyBadge, UserStatusBadge } from "@/components/badge";
import { LeaveButton } from "./leave-button";

export default async function UserClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("User");
  const { id } = await params;
  const classId = parseInt(id, 10);
  if (isNaN(classId)) notFound();

  const [classDetail, problems] = await Promise.all([
    classRepository.getClassDetail(classId, user.userId),
    classRepository.getClassProblems(classId, user.userId),
  ]);

  if (!classDetail) notFound();

  const leaveActionWithId = leaveClassAction.bind(null, classId);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/user/classes"
            className="text-sm font-medium text-fg-muted hover:text-fg hover:underline"
          >
            ← Quay lại danh sách lớp học
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{classDetail.ClassName}</h1>
          <p className="mt-1 text-fg-muted">
            {classDetail.Description || "Chưa có mô tả cho lớp học này."}
          </p>
        </div>

        {classDetail.IsJoined && (
          <form action={leaveActionWithId}>
            <LeaveButton />
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Giảng viên
          </span>
          <p className="mt-2 text-lg font-bold text-fg">{classDetail.TeacherName}</p>
          <span className="text-xs text-fg-muted">{classDetail.TeacherEmail}</span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Trạng thái tham gia
          </span>
          <p className="mt-2 text-lg font-bold text-ok">
            {classDetail.IsJoined ? "Đã tham gia" : "Chưa tham gia"}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Sĩ số lớp
          </span>
          <p className="mt-2 text-lg font-bold text-fg">{classDetail.StudentCount} học sinh</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bài tập được giao ({problems.length})</h2>
        </div>

        {problems.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-fg-muted">
            Lớp học hiện chưa có bài tập nào được giao. Vui lòng quay lại sau!
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-xs uppercase text-fg-muted">
                <tr>
                  <th className="px-5 py-3">Bài tập</th>
                  <th className="px-5 py-3">Độ khó</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Hạn nộp</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {problems.map((p) => (
                  <tr key={p.ProblemID} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/user/problems/${p.ProblemID}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {p.Title}
                      </Link>
                      <div className="mt-0.5 text-xs text-fg-muted">
                        Giới hạn: {(p.TimeLimit / 1000).toFixed(1)}s, {p.MemoryLimit}MB
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <DifficultyBadge value={p.Difficulty} />
                    </td>
                    <td className="px-5 py-4">
                      <UserStatusBadge value={p.UserStatus} />
                    </td>
                    <td className="px-5 py-4 text-xs text-fg-muted">
                      {p.DueDate
                        ? new Date(p.DueDate).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "Không giới hạn"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/user/problems/${p.ProblemID}`}
                        className="inline-flex items-center rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-muted transition-colors"
                      >
                        Làm bài →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
