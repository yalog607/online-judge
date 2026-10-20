import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { ContestStatusBadge, DifficultyBadge } from "@/components/badge";

function formatDateTime(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}


export default async function AdminContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const actor = await requireRole("Admin");
  const { id } = await params;
  const sParams = await searchParams;
  const contestId = Number(id);
  if (isNaN(contestId)) notFound();

  const [contest, problems, leaderboard] = await Promise.all([
    contestRepository.getContest(contestId, actor.userId),
    contestRepository.listProblems(contestId, actor.userId).catch(() => []),
    contestRepository.getLeaderboard(contestId, actor.userId).catch(() => []),
  ]);

  if (!contest) notFound();

  const activeTab = sParams?.tab || "problems";

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors"
          >
            ← Quay lại danh sách kỳ thi
          </Link>
          <span className="rounded-full bg-muted border border-line px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            Quyền Quản trị viên: Chỉ xem
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-fg">{contest.contestName}</h1>
              <ContestStatusBadge status={contest.status} />
              {contest.isProtected && (
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  Có mật khẩu
                </span>
              )}
            </div>
            {contest.description && (
              <p className="mt-1 text-sm text-fg-muted whitespace-pre-line">{contest.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs text-fg-muted">Thời gian bắt đầu</span>
          <p className="mt-1 text-sm font-semibold text-fg">{formatDateTime(contest.startTime)}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-fg-muted">Thời gian kết thúc</span>
          <p className="mt-1 text-sm font-semibold text-fg">{formatDateTime(contest.endTime)}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-fg-muted">Số lượng bài tập</span>
          <p className="mt-1 text-sm font-semibold text-fg">{problems.length} bài</p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-fg-muted">Số thí sinh tham gia</span>
          <p className="mt-1 text-sm font-semibold text-fg">{contest.participantCount} thí sinh</p>
        </div>
      </div>

      <div className="flex border-b border-line gap-4">
        <Link
          href={`/admin/contests/${contestId}?tab=problems`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "problems"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Đề thi ({problems.length})
        </Link>
        <Link
          href={`/admin/contests/${contestId}?tab=leaderboard`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "leaderboard"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Bảng xếp hạng ({leaderboard.length})
        </Link>
      </div>

      {activeTab === "problems" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Danh sách bài tập trong đề thi</h2>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-fg-muted font-medium">
                <tr>
                  <th className="px-4 py-3 w-16">STT</th>
                  <th className="px-4 py-3">Tên bài tập</th>
                  <th className="px-4 py-3">Độ khó</th>
                  <th className="px-4 py-3">Giới hạn</th>
                  <th className="px-4 py-3 text-right">Điểm tối đa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {problems.length === 0 ? (
                  <EmptyState variant="cell" colSpan={5}>Chưa có bài tập nào trong đề thi.</EmptyState>
                ) : (
                  problems.map((p, idx) => (
                    <tr key={p.problemId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                        {p.orderIndex || idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">
                        <Link
                          href={`/admin/problems/${p.problemId}`}
                          className="hover:underline font-semibold"
                        >
                          #{p.problemId} - {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge value={p.difficulty} />
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {(p.timeLimit / 1000).toFixed(1)}s / {p.memoryLimit}MB
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary text-right">
                        {p.maxScore} điểm
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Bảng xếp hạng trực tiếp</h2>
            <Link
              href={`/admin/contests/${contestId}?tab=leaderboard`}
              className="text-xs text-primary hover:underline"
            >
              Làm mới bảng xếp hạng
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-fg-muted font-medium">
                <tr>
                  <th className="px-4 py-3 w-16">Hạng</th>
                  <th className="px-4 py-3">Thí sinh</th>
                  <th className="px-4 py-3 text-center">Số bài giải</th>
                  <th className="px-4 py-3 text-center">Tổng điểm</th>
                  <th className="px-4 py-3 text-right">Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leaderboard.length === 0 ? (
                  <EmptyState variant="cell" colSpan={5}>Chưa có thí sinh nào tham gia hoặc nộp bài.</EmptyState>
                ) : (
                  leaderboard.map((row) => (
                    <tr key={row.userId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-center">
                        {row.rank === 1 && <span className="text-amber-500 font-extrabold text-base">🥇 1</span>}
                        {row.rank === 2 && <span className="text-slate-400 font-extrabold text-base">🥈 2</span>}
                        {row.rank === 3 && <span className="text-amber-700 font-extrabold text-base">🥉 3</span>}
                        {row.rank > 3 && <span className="text-fg-muted">#{row.rank}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                            {row.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold block">{row.fullName}</span>
                            <span className="text-xs text-fg-muted">@{row.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-500">
                        {row.problemsSolved} / {problems.length}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-primary text-base">
                        {row.totalScore}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted">
                        {row.penaltyTime} phút
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
