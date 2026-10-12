import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserPersonalProgress } from "@/modules/report/repo";

export const metadata = {
  title: "Tổng quan & Báo cáo tiến bộ - ITOJ",
};

export default async function UserDashboardPage() {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const data = await getUserPersonalProgress(session.userId, session.userId);
  const { summary, difficulties, tags, recentSubmissions, classes } = data;

  const totalSystem = Math.max(1, summary.TotalSystemProblems);
  const overallRate = Math.min(100, Math.round((summary.TotalSolved / totalSystem) * 100));

  const initial = summary.FullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-8 pt-6 pb-12">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-primary text-xl font-black text-primary-fg shadow-sm">
              {initial}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-fg">
                  {summary.FullName}
                </h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {summary.Role === "TA" ? "Trợ giảng" : summary.Role === "Teacher" ? "Giảng viên" : summary.Role === "Admin" ? "Quản trị viên" : "Học viên"}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                @{summary.Username} · {summary.Email} · Tham gia từ {new Date(summary.CreatedAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/user/problems"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity shadow-xs"
            >
              Luyện tập bài mới →
            </Link>
            <Link
              href="/user/classes"
              className="rounded-xl border border-line bg-muted/60 px-4 py-2 text-xs font-semibold text-fg hover:bg-muted transition-colors"
            >
              Lớp học của tôi
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Bài tập đã giải
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.TotalSolved}
            </span>
            <span className="text-xs text-fg-muted">
              / {summary.TotalSystemProblems} bài ({overallRate}%)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </div>

        <div className="card rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Lượt nộp & Tỉ lệ đạt
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary">
              {summary.TotalSubmissions}
            </span>
            <span className="text-xs text-fg-muted">
              lượt nộp
            </span>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{summary.TotalACSubmissions}</strong> lượt AC · Tỉ lệ đạt <strong className="text-fg">{summary.PassRatePercent}%</strong>
          </p>
        </div>

        <div className="card rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Lớp học tham gia
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-violet-600 dark:text-violet-400">
              {summary.EnrolledClassCount}
            </span>
            <span className="text-xs text-fg-muted">
              lớp đang học
            </span>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            <Link href="/user/classes" className="text-primary hover:underline">
              Xem tiến độ các lớp →
            </Link>
          </p>
        </div>

        <div className="card rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Kỳ thi tham gia
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {summary.ContestCount}
            </span>
            <span className="text-xs text-fg-muted">
              kỳ thi
            </span>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            <Link href="/user/contests" className="text-primary hover:underline">
              Bảng xếp hạng kỳ thi →
            </Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <h2 className="text-base font-bold text-fg">
              Phân bố năng lực theo độ khó
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Số lượng bài tập đã hoàn thành tương ứng với từng cấp độ thử thách.
            </p>

            <div className="mt-5 space-y-4">
              {difficulties.map((diff) => {
                const total = Math.max(1, diff.TotalCount);
                const percent = Math.min(100, Math.round((diff.SolvedCount / total) * 100));
                const color =
                  diff.Difficulty === "Easy"
                    ? "bg-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : diff.Difficulty === "Medium"
                      ? "bg-amber-500 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500 text-rose-600 dark:text-rose-400";

                const label =
                  diff.Difficulty === "Easy"
                    ? "Dễ (Easy)"
                    : diff.Difficulty === "Medium"
                      ? "Trung bình (Medium)"
                      : "Khó (Hard)";

                return (
                  <div key={diff.Difficulty} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-fg">{label}</span>
                      <span className="font-mono text-fg-muted">
                        <strong className="text-fg">{diff.SolvedCount}</strong> / {diff.TotalCount} bài ({percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color.split(" ")[0]}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <h2 className="text-base font-bold text-fg">
              Chủ đề & Dạng bài đã giải
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Các chủ đề bài tập bạn đã chinh phục thành công (AC).
            </p>

            {tags.length === 0 ? (
              <p className="mt-4 text-xs text-fg-muted">
                Bạn chưa giải được bài tập nào có gắn nhãn chủ đề.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t.Tag}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-muted/60 px-3 py-1.5 text-xs font-semibold text-fg"
                  >
                    <span>{t.Tag}</span>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                      {t.SolvedCount}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-fg">
                  Tiến độ các lớp học
                </h2>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Theo dõi tỉ lệ giải bài trong các lớp bạn đang tham gia.
                </p>
              </div>
              <Link
                href="/user/classes"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tất cả lớp →
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-xs text-fg-muted">
                Bạn chưa tham gia lớp học nào. Hãy sử dụng mã mời để tham gia lớp!
              </div>
            ) : (
              <div className="mt-4 divide-y divide-line">
                {classes.map((c) => (
                  <div key={c.ClassID} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/user/classes/${c.ClassID}`}
                          className="font-bold text-sm text-fg hover:text-primary transition-colors"
                        >
                          {c.ClassName}
                        </Link>
                        <p className="text-xs text-fg-muted">
                          Giảng viên: {c.TeacherName} · Đã giải: {c.SolvedCount}/{c.TotalProblems} bài
                        </p>
                      </div>
                      <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {c.ProgressPercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, c.ProgressPercent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-fg">
              Lịch sử bài nộp gần đây
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Theo dõi kết quả các lần biên dịch và chấm điểm bài tập mới nhất của bạn.
            </p>
          </div>
          <Link
            href="/user/problems"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Tìm bài tập mới →
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-xs text-fg-muted">
            Bạn chưa có bài nộp nào trong hệ thống. Hãy chọn một bài tập để bắt đầu làm bài!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-muted text-[10px] uppercase font-semibold text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Mã bài nộp</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3">Ngôn ngữ</th>
                  <th className="px-4 py-3">Kết quả</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Bộ nhớ</th>
                  <th className="px-4 py-3">Thời điểm nộp</th>
                  <th className="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentSubmissions.map((s) => (
                  <tr key={s.SubmissionID} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-fg-muted">
                      #{s.SubmissionID}
                    </td>
                    <td className="px-4 py-3 font-semibold text-fg">
                      <Link
                        href={`/user/problems/${s.ProblemID}`}
                        className="hover:text-primary transition-colors"
                      >
                        {s.ProblemTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{s.Language}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block font-mono font-bold text-xs ${
                          s.Result === "AC"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {s.Result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted font-mono">
                      {s.Runtime != null ? `${s.Runtime} ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-fg-muted font-mono">
                      {s.Memory != null ? `${s.Memory} MB` : "-"}
                    </td>
                    <td className="px-4 py-3 text-fg-muted whitespace-nowrap">
                      {new Date(s.SubmitTime).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/submissions/${s.SubmissionID}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Xem bài làm →
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
