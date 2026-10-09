import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { DifficultyBadge } from "@/components/badge";
import { JoinContestDialog } from "../join-contest-dialog";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: "Upcoming" | "Ongoing" | "Ended" }) {
  if (status === "Ongoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Đang diễn ra
      </span>
    );
  }
  if (status === "Upcoming") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
        Sắp diễn ra
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400 border border-slate-500/20">
      Đã kết thúc
    </span>
  );
}

export default async function UserContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sParams = await searchParams;
  const contestId = Number(id);
  if (isNaN(contestId)) notFound();

  const [contest, problems, leaderboard] = await Promise.all([
    contestRepository.getContest(contestId, user.userId),
    contestRepository.listProblems(contestId, user.userId).catch(() => []),
    contestRepository.getLeaderboard(contestId).catch(() => []),
  ]);

  if (!contest) notFound();

  const activeTab = sParams?.tab || "problems";

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <Link
          href="/user/contests"
          className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors mb-2"
        >
          ← Quay lại danh sách kỳ thi
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-fg">{contest.contestName}</h1>
              <StatusBadge status={contest.status} />
              {contest.className && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  Lớp: {contest.className}
                </span>
              )}
            </div>
            {contest.description && (
              <p className="mt-1 text-sm text-fg-muted whitespace-pre-line">{contest.description}</p>
            )}
          </div>

          {!contest.isJoined && contest.status !== "Ended" && (
            <JoinContestDialog
              contestId={contestId}
              contestName={contest.contestName}
              isProtected={contest.isProtected}
            />
          )}
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
          <span className="text-xs text-fg-muted">Số lượng đề bài</span>
          <p className="mt-1 text-sm font-semibold text-fg">{contest.problemCount} bài tập</p>
        </div>
        <div className="card p-4">
          <span className="text-xs text-fg-muted">Thí sinh đã tham gia</span>
          <p className="mt-1 text-sm font-semibold text-fg">{contest.participantCount} người</p>
        </div>
      </div>

      {contest.status === "Upcoming" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <h3 className="text-base font-semibold text-amber-500">Kỳ thi chưa bắt đầu</h3>
          <p className="mt-1 text-xs text-fg-muted">
            Đề thi gồm <strong>{contest.problemCount} bài tập</strong> sẽ chính thức được mở khi đến thời gian bắt đầu vào lúc <strong>{formatDateTime(contest.startTime)}</strong>. Vui lòng quay lại sau.
          </p>
        </div>
      )}

      {contest.status === "Ended" && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <h3 className="text-sm font-semibold text-fg-muted">Kỳ thi đã kết thúc</h3>
          <p className="mt-1 text-xs text-fg-subtle">
            Kỳ thi đã đóng bài nộp tính điểm. Bạn có thể xem lại đề bài và bảng xếp hạng chung cuộc bên dưới.
          </p>
        </div>
      )}

      <div className="flex border-b border-line gap-4">
        <Link
          href={`/user/contests/${contestId}?tab=problems`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "problems"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Đề thi ({contest.status === "Upcoming" ? contest.problemCount : problems.length})
        </Link>
        <Link
          href={`/user/contests/${contestId}?tab=leaderboard`}
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
          {contest.status === "Upcoming" ? (
            <div className="card p-12 text-center text-fg-muted text-sm">
              Đề thi đang được bảo mật và sẽ mở khi kỳ thi bắt đầu.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-muted text-fg-muted font-medium">
                  <tr>
                    <th className="px-4 py-3 w-16">STT</th>
                    <th className="px-4 py-3">Tên bài tập</th>
                    <th className="px-4 py-3">Độ khó</th>
                    <th className="px-4 py-3">Giới hạn</th>
                    <th className="px-4 py-3">Điểm tối đa</th>
                    <th className="px-4 py-3">Trạng thái của bạn</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {problems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-fg-muted">
                        Kỳ thi chưa có bài tập nào.
                      </td>
                    </tr>
                  ) : (
                    problems.map((p, idx) => (
                      <tr key={p.problemId} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                          {p.orderIndex || idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-fg">
                          <Link
                            href={`/user/problems/${p.problemId}?contestId=${contestId}`}
                            className="hover:underline font-semibold"
                          >
                            {p.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <DifficultyBadge value={p.difficulty} />
                        </td>
                        <td className="px-4 py-3 text-xs text-fg-muted">
                          {(p.timeLimit / 1000).toFixed(1)}s / {p.memoryLimit}MB
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {p.maxScore} điểm
                        </td>
                        <td className="px-4 py-3">
                          {p.solved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✓ Đã giải (+{p.maxScore})
                            </span>
                          ) : p.wrongCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Chưa đạt ({p.wrongCount} lần sai)
                            </span>
                          ) : (
                            <span className="text-xs text-fg-subtle">Chưa nộp</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {contest.status === "Ended" ? (
                            <Link
                              href={`/user/problems/${p.problemId}?contestId=${contestId}`}
                              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg hover:bg-muted transition-colors"
                            >
                              Xem đề
                            </Link>
                          ) : (
                            <Link
                              href={`/user/problems/${p.problemId}?contestId=${contestId}`}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity"
                            >
                              Làm bài →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Bảng xếp hạng kỳ thi</h2>
            <Link
              href={`/user/contests/${contestId}?tab=leaderboard`}
              className="text-xs text-primary hover:underline"
            >
              Làm mới bảng xếp hạng
            </Link>
          </div>

          <div className="card overflow-hidden">
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
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-fg-muted">
                      Chưa có thí sinh nào nộp bài.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((row) => (
                    <tr
                      key={row.userId}
                      className={`hover:bg-muted/40 transition-colors ${
                        row.userId === user.userId ? "bg-primary/5 font-semibold" : ""
                      }`}
                    >
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
                            <span className="font-semibold block">
                              {row.fullName}
                              {row.userId === user.userId && (
                                <span className="ml-1.5 text-[11px] font-normal text-primary">
                                  (Bạn)
                                </span>
                              )}
                            </span>
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
      )}
    </div>
  );
}
