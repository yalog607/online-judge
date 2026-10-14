import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getUserDashboard } from "@/modules/dashboard/service";
import { getUserPersonalProgress } from "@/modules/report/repo";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { StatCard, Panel } from "@/components/stat-card";
import { Heatmap } from "@/components/dashboard-charts";

export const metadata = { title: "Tổng quan & Tiến độ cá nhân - ITOJ" };

const VN_TZ = "Asia/Ho_Chi_Minh";

function formatRange(start: Date, end: Date) {
  const date = start.toLocaleDateString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString("vi-VN", {
      timeZone: VN_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return `${date} · ${time(start)} – ${time(end)}`;
}

export default async function UserDashboard() {
  const user = await requireUser();
  const [dashboard, progress] = await Promise.all([
    getUserDashboard(user.userId),
    getUserPersonalProgress(user.userId, user.userId),
  ]);
  const { summary: s, heatmap, contest } = dashboard;
  const { difficulties, tags, recentSubmissions, classes } = progress;
  const acRate = s.TotalSubmissions > 0 ? Math.round((s.TotalAC / s.TotalSubmissions) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 pt-8 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Chào {user.fullName}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {s.SolvedThisWeek > 0
              ? `Bạn đã giải ${s.SolvedThisWeek} bài trong tuần này. Tiếp tục phát huy nhé!`
              : "Tuần này bạn chưa giải bài nào. Bắt đầu luyện một bài mới nhé!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/user/problems"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity"
          >
            <Icon name="code" size={16} />
            Luyện bài mới
          </Link>
          <Link
            href="/user/classes"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-muted/60 px-4 py-2.5 text-sm font-medium text-fg hover:bg-muted transition-colors"
          >
            <Icon name="users" size={16} />
            Lớp học của tôi
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="code"
          label="Bài đã giải"
          value={s.ProblemsSolved}
          hint={`+${s.SolvedThisWeek} tuần này`}
          tone={s.SolvedThisWeek > 0 ? "up" : "neutral"}
        />
        <StatCard
          icon="fire"
          label="Chuỗi ngày liên tiếp"
          value={s.CurrentStreak}
          hint={`Kỷ lục ${s.LongestStreak} ngày`}
        />
        <StatCard
          icon="trophy"
          label="Xếp hạng"
          value={s.Rank ? `#${s.Rank}` : "—"}
          hint={s.Rank ? `trên ${s.RankedUsers} học viên` : "Giải bài đầu tiên để có hạng"}
        />
        <StatCard
          icon="chart"
          label="Tỉ lệ AC"
          value={`${acRate}%`}
          hint={`${s.TotalSubmissions} lượt nộp`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Hoạt động 26 tuần gần nhất">
          <div className="p-5">
            <Heatmap cells={heatmap} />
          </div>
        </Panel>

        <Panel title="Kỳ thi sắp diễn ra">
          {contest ? (
            <div className="flex flex-col gap-3 p-5">
              <b>{contest.ContestName}</b>
              <div className="text-fg-muted">
                {formatRange(new Date(contest.StartTime), new Date(contest.EndTime))} ·{" "}
                {contest.ProblemCount} bài
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge kind={contest.Status === "Ongoing" ? "ok" : "info"}>
                  {contest.Status === "Ongoing" ? "Đang diễn ra" : "Sắp diễn ra"}
                </Badge>
                {contest.IsProtected ? <Badge>Có mật khẩu</Badge> : null}
              </div>
              <Link
                href={`/user/contests/${contest.ContestID}`}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <Icon name="trophy" size={16} />
                Xem chi tiết
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-5 text-fg-muted">
              <p>Hiện chưa có kỳ thi nào sắp diễn ra.</p>
              <Link href="/user/contests" className="font-medium text-primary hover:underline">
                Xem tất cả kỳ thi
              </Link>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
