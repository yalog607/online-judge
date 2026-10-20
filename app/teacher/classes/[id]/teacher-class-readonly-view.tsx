import Link from "next/link";
import { DifficultyBadge } from "@/components/badge";
import type { ClassProblemItem, TeacherClassView } from "@/modules/class/repo";

export function TeacherClassReadonlyView({
  classDetail,
  problems,
}: {
  classDetail: TeacherClassView;
  problems: ClassProblemItem[];
}) {
  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <Link
          href="/teacher/classes"
          className="text-sm font-medium text-fg-muted hover:text-fg hover:underline"
        >
          ← Quay lại danh sách lớp
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{classDetail.ClassName}</h1>
          <span className="rounded-full border border-ok/30 bg-ok/10 px-2.5 py-0.5 text-xs font-medium text-ok">
            Công khai
          </span>
        </div>
        <p className="mt-1 text-fg-muted">
          {classDetail.Description || "Chưa có mô tả cho lớp học này."}
        </p>
        <p className="mt-2 text-sm text-fg-muted">Giảng viên: {classDetail.TeacherName}</p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bài tập của lớp</h2>
          <p className="text-xs text-fg-muted">Các bài tập công khai được giao cho lớp.</p>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted font-medium text-fg-muted">
              <tr>
                <th className="px-4 py-3">Tên bài tập</th>
                <th className="px-4 py-3">Độ khó</th>
                <th className="px-4 py-3">Ngày giao</th>
                <th className="px-4 py-3">Hạn nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-fg-muted">
                    Lớp chưa có bài tập công khai.
                  </td>
                </tr>
              ) : (
                problems.map((problem) => (
                  <tr key={problem.ProblemID} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/teacher/problems/${problem.ProblemID}`}
                        className="hover:text-primary hover:underline"
                      >
                        {problem.Title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={problem.Difficulty} />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Date(problem.AssignedDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {problem.DueDate
                        ? new Date(problem.DueDate).toLocaleString("vi-VN")
                        : "Không thời hạn"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}
