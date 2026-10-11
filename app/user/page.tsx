import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getUserDashboard } from "@/modules/dashboard/service";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { StatCard, Panel } from "@/components/stat-card";
import { Heatmap } from "@/components/dashboard-charts";

export const metadata = { title: "Tổng quan - ITOJ" };

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
  const { summary: s, heatmap, contest } = await getUserDashboard(user.userId);
  const acRate = s.TotalSubmissions > 0 ? Math.round((s.TotalAC / s.TotalSubmissions) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chào {user.fullName}</h1>
          <p className="mt-1 text-fg-muted">
            {s.SolvedThisWeek > 0
              ? `Bạn đã giải ${s.SolvedThisWeek} bài trong tuần này. Tiếp tục nào.`
              : "Tuần này bạn chưa giải bài nào. Bắt đầu một bài mới nhé."}
          </p>
        </div>
        <Link
          href="/user/problems"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          <Icon name="code" size={16} />
          Luyện bài mới
        </Link>
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
    </div>
  );
}
