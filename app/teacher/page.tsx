import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getTeacherDashboard } from "@/modules/dashboard/service";
import { VerdictBadge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { StatCard, Panel, EmptyNote } from "@/components/stat-card";
import { LineChart } from "@/components/dashboard-charts";

export const metadata = { title: "Tổng quan - ITOJ Giảng viên" };

const VN_TZ = "Asia/Ho_Chi_Minh";

function formatDue(d: Date | null) {
  if (!d) return "Chưa có";
  return new Date(d).toLocaleDateString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDelta(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? "Hôm qua chưa có bài nộp" : "Chưa có bài nộp";
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% so với hôm qua`;
}

export default async function TeacherDashboard() {
  const user = await requireRole("Teacher");
  const { summary: s, series, recent, classes } = await getTeacherDashboard(user.userId);
  const pending = s.PendingClasses + s.PendingProblems + s.PendingTaRequests;
  const pendingParts = [
    s.PendingClasses ? `${s.PendingClasses} lớp` : null,
    s.PendingProblems ? `${s.PendingProblems} bài tập` : null,
    s.PendingTaRequests ? `${s.PendingTaRequests} yêu cầu trợ giảng` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
          <p className="mt-1 text-fg-muted">Theo dõi tiến độ các lớp bạn phụ trách.</p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          <Icon name="upload" size={16} />
          Tạo bài tập
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="users"
          label="Lớp phụ trách"
          value={s.ClassCount}
          hint={`${s.StudentCount} học viên`}
        />
        <StatCard
          icon="code"
          label="Bài đang mở"
          value={s.OpenProblems}
          hint={`${s.ExpiringSoon} sắp hết hạn`}
          tone={s.ExpiringSoon > 0 ? "down" : "neutral"}
        />
        <StatCard
          icon="send"
          label="Bài nộp hôm nay"
          value={s.SubmissionsToday}
          hint={formatDelta(s.SubmissionsToday, s.SubmissionsYesterday)}
          tone={
            s.SubmissionsToday > s.SubmissionsYesterday
              ? "up"
              : s.SubmissionsToday < s.SubmissionsYesterday
                ? "down"
                : "neutral"
          }
        />
        <StatCard
          icon="shield"
          label="Chờ duyệt"
          value={pending}
          hint={pending > 0 ? pendingParts.join(" · ") : "Không có mục nào"}
          tone={pending > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Bài nộp 7 ngày qua">
          <div className="p-5">
            <LineChart values={series.map((p) => p.value)} labels={series.map((p) => p.label)} />
          </div>
        </Panel>

        <Panel title="Bài nộp mới nhất">
          {recent.length === 0 ? (
            <EmptyNote>Chưa có bài nộp nào từ học viên.</EmptyNote>
          ) : (
            <ul>
              {recent.map((r) => (
                <li key={r.SubmissionID} className="border-b border-line last:border-0">
                  <Link
                    href={`/submissions/${r.SubmissionID}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <b className="block truncate">{r.FullName}</b>
                      <div className="truncate text-fg-muted">{r.ProblemTitle}</div>
                    </div>
                    <VerdictBadge value={r.Result} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Tiến độ các lớp">
        {classes.length === 0 ? (
          <EmptyNote>Bạn chưa có lớp nào được duyệt.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-fg-muted uppercase">
                  <th className="border-b border-line px-5 py-3">Lớp</th>
                  <th className="border-b border-line px-5 py-3">Sĩ số</th>
                  <th className="border-b border-line px-5 py-3">Tiến độ TB</th>
                  <th className="border-b border-line px-5 py-3">Hạn nộp gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.ClassID} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/teacher/classes/${c.ClassID}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {c.ClassName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums">{c.StudentCount}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-soft">
                          <div
                            className={`h-full rounded-full ${c.AvgProgress >= 80 ? "bg-ok" : "bg-primary"}`}
                            style={{ width: `${Math.min(100, Math.max(0, c.AvgProgress))}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-fg-muted">{c.AvgProgress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums">{formatDue(c.NextDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
