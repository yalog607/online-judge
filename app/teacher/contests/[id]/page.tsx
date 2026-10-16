import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { classRepository } from "@/modules/class/repo";
import { listForManage as listProblemsForManage } from "@/modules/problem/repo";
import { DifficultyBadge, VerdictBadge } from "@/components/badge";
import { StatCard } from "@/components/stat-card";
import { Pager } from "@/components/pager";
import { EditContestDialog } from "./edit-contest-dialog";
import { AddProblemDialog } from "./add-problem-dialog";
import { EditProblemScoreDialog } from "./edit-problem-score-dialog";
import { RemoveProblemButton } from "./remove-problem-button";
import { StartContestDialog } from "./start-contest-dialog";
import { DeleteContestDialog } from "../delete-contest-dialog";
import { listComments } from "@/modules/comment/repo";
import { Comments } from "@/components/comments";
import { mapToCommentView } from "@/modules/comment/view";
import { ContestParticipantPage } from "@/modules/contest/participant-page";

function formatDateTime(iso: string) {
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

export default async function TeacherContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; page?: string; problemId?: string; result?: string }>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const sParams = await searchParams;
  const contestId = Number(id);
  if (isNaN(contestId)) notFound();

  const contest = await contestRepository.getContest(contestId, actor.userId);
  if (!contest) notFound();

  const canManage = actor.role === "Admin" || contest.creatorId === actor.userId;
  if (!canManage) {
    return (
      <ContestParticipantPage
        params={Promise.resolve({ id })}
        searchParams={searchParams}
        contestBasePath="/teacher/contests"
        listHref="/teacher/contests"
      />
    );
  }

  const activeTab = sParams?.tab || "problems";
  const page = Math.max(1, Number(sParams?.page) || 1);
  const selectedProblemId = sParams?.problemId ? Number(sParams.problemId) : undefined;
  const selectedResult = sParams?.result || undefined;
  const PAGE_SIZE = 20;

  const [problems, leaderboard, rawComments, { classes }, publicProblems, privateProblems, submissionsData] = await Promise.all(
    [
      contestRepository.listProblems(contestId, actor.userId).catch(() => []),
      contestRepository.getLeaderboard(contestId, actor.userId).catch(() => []),
      listComments({ kind: "contest", id: contestId }, actor.userId).catch(() => []),
      classRepository.listClasses({
        userId: actor.userId,
        onlyMine: true,
        page: 1,
        pageSize: 100,
      }),
      listProblemsForManage({
        actorId: actor.userId,
        status: "Public",
        page: 1,
        pageSize: 100,
      }),
      listProblemsForManage({
        actorId: actor.userId,
        status: "Private",
        page: 1,
        pageSize: 100,
      }),
      activeTab === "submissions"
        ? contestRepository.getContestSubmissions(contestId, actor.userId, page, PAGE_SIZE, selectedProblemId, selectedResult).catch(() => ({
            summary: { TotalSubmissions: 0, SolvedUsers: 0, AttemptedUsers: 0, AcRate: 0 },
            items: [],
            total: 0,
          }))
        : Promise.resolve({
            summary: { TotalSubmissions: 0, SolvedUsers: 0, AttemptedUsers: 0, AcRate: 0 },
            items: [],
            total: 0,
          }),
    ],
  );

  const VERDICT_FILTERS = [
    { label: "Tất cả", value: "" },
    { label: "AC", value: "AC" },
    { label: "WA", value: "WA" },
    { label: "TLE", value: "TLE" },
    { label: "MLE", value: "MLE" },
    { label: "RE", value: "RE" },
    { label: "CE", value: "CE" },
  ];

  const buildSubmissionsHref = (filterParams: { page?: number; problemId?: number | null; result?: string | null }) => {
    const query = new URLSearchParams();
    query.set("tab", "submissions");
    const p = filterParams.page !== undefined ? filterParams.page : page;
    if (p > 1) query.set("page", String(p));
    const prob = filterParams.problemId !== undefined ? filterParams.problemId : selectedProblemId;
    if (prob) query.set("problemId", String(prob));
    const res = filterParams.result !== undefined ? filterParams.result : selectedResult;
    if (res) query.set("result", res);
    return `/teacher/contests/${contestId}?${query.toString()}`;
  };

  const classOptions = classes.map((c) => ({
    classId: c.ClassID,
    className: c.ClassName,
  }));

  const attachedProblemIds = new Set(problems.map((p) => p.problemId));
  const availableToAdd = [...publicProblems.rows, ...privateProblems.rows]
    .filter((p) => !attachedProblemIds.has(p.ProblemID) && (p.Status === "Public" || p.CanManage))
    .map((p) => ({
      problemId: p.ProblemID,
      title: p.Title,
      difficulty: p.Difficulty,
    }));

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <Link
          href="/teacher/contests"
          className="mb-2 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg-muted transition-colors hover:bg-muted hover:text-fg"
        >
          ← Thoát kỳ thi
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-fg">{contest.contestName}</h1>
              <StatusBadge status={contest.status} />
              <span className="text-xs text-fg-muted">Tạo bởi {contest.creatorName}</span>
              {contest.isProtected && (
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                  Có mật khẩu
                </span>
              )}
            </div>
            {contest.description && (
              <p className="mt-1 text-sm text-fg-muted whitespace-pre-line">
                {contest.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StartContestDialog
              contestId={contestId}
              currentStatus={contest.status}
              contestName={contest.contestName}
            />
            <EditContestDialog contest={contest} classes={classOptions} />
            <DeleteContestDialog
              contestId={contestId}
              contestName={contest.contestName}
              redirectTo="/teacher/contests"
            />
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
          href={`/teacher/contests/${contestId}?tab=problems`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "problems"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Đề thi ({problems.length})
        </Link>
        <Link
          href={`/teacher/contests/${contestId}?tab=leaderboard`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "leaderboard"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Bảng xếp hạng ({leaderboard.length})
        </Link>
        <Link
          href={`/teacher/contests/${contestId}?tab=submissions`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "submissions"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Lịch sử nộp bài ({submissionsData.total})
        </Link>
        <Link
          href={`/teacher/contests/${contestId}?tab=comments`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "comments"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Bình luận ({rawComments.length})
        </Link>
      </div>

      {activeTab === "problems" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Danh sách bài tập trong đề thi</h2>
            {contest.status !== "Ended" && (
              <AddProblemDialog
                contestId={contestId}
                availableProblems={availableToAdd}
                nextOrderIndex={problems.length + 1}
              />
            )}
          </div>

          {contest.status === "Ongoing" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Kỳ thi đang diễn ra. Bạn vẫn có thể thêm bài, gỡ bài hoặc đổi điểm số; hệ thống sẽ tự động đồng bộ và tính lại điểm số trên bảng xếp hạng theo thời gian thực.
              </span>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-fg-muted font-medium">
                <tr>
                  <th className="px-4 py-3 w-16">STT</th>
                  <th className="px-4 py-3">Tên bài tập</th>
                  <th className="px-4 py-3">Độ khó</th>
                  <th className="px-4 py-3">Giới hạn</th>
                  <th className="px-4 py-3">Điểm tối đa</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {problems.length === 0 ? (
                  <EmptyState variant="cell" colSpan={6}>Chưa có bài tập nào trong đề thi. Nhấn &quot;Thêm bài tập&quot; để gán bài vào
                      kỳ thi.</EmptyState>
                ) : (
                  problems.map((p, idx) => (
                    <tr key={p.problemId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                        {p.orderIndex || idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">
                        <Link
                          href={`/teacher/problems/${p.problemId}`}
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{p.maxScore} điểm</span>
                          {contest.status !== "Ended" && (
                            <EditProblemScoreDialog
                              contestId={contestId}
                              problemId={p.problemId}
                              problemTitle={p.title}
                              currentScore={p.maxScore}
                              isOngoing={contest.status === "Ongoing"}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/teacher/contests/${contestId}?tab=submissions&problemId=${p.problemId}`}
                            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                          >
                            DS nộp bài
                          </Link>
                          {contest.status !== "Ended" ? (
                            <RemoveProblemButton
                              contestId={contestId}
                              problemId={p.problemId}
                              problemTitle={p.title}
                              isOngoing={contest.status === "Ongoing"}
                            />
                          ) : (
                            <span className="text-xs text-fg-muted font-mono">Đã kết thúc</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Bảng xếp hạng trực tiếp</h2>
            <Link
              href={`/teacher/contests/${contestId}?tab=leaderboard`}
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
                  <EmptyState variant="cell" colSpan={5}>Chưa có thí sinh nào tham gia hoặc nộp bài.</EmptyState>
                ) : (
                  leaderboard.map((row) => (
                    <tr key={row.userId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-center">
                        {row.rank === 1 && (
                          <span className="text-amber-500 font-extrabold text-base">🥇 1</span>
                        )}
                        {row.rank === 2 && (
                          <span className="text-slate-400 font-extrabold text-base">🥈 2</span>
                        )}
                        {row.rank === 3 && (
                          <span className="text-amber-700 font-extrabold text-base">🥉 3</span>
                        )}
                        {row.rank > 3 && <span className="text-fg-muted">#{row.rank}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                            {row.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold block">{row.fullName}</span>
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

      {activeTab === "submissions" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon="send"
              label="Tổng lượt nộp"
              value={submissionsData.summary.TotalSubmissions}
            />
            <StatCard
              icon="check"
              label="Thí sinh giải đúng (AC)"
              value={submissionsData.summary.SolvedUsers}
              tone="up"
            />
            <StatCard
              icon="users"
              label="Thí sinh đã nộp bài"
              value={submissionsData.summary.AttemptedUsers}
            />
            <StatCard
              icon="chart"
              label="Tỉ lệ hoàn thành"
              value={`${submissionsData.summary.AcRate}%`}
              tone={submissionsData.summary.AcRate >= 50 ? "up" : "down"}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-muted mr-1">Bài tập:</span>
              <Link
                href={buildSubmissionsHref({ problemId: null, page: 1 })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  !selectedProblemId
                    ? "bg-primary text-primary-fg"
                    : "bg-muted text-fg-muted hover:text-fg"
                }`}
              >
                Tất cả bài tập
              </Link>
              {problems.map((prob) => {
                const isSelected = selectedProblemId === prob.problemId;
                return (
                  <Link
                    key={prob.problemId}
                    href={buildSubmissionsHref({ problemId: prob.problemId, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-fg"
                        : "bg-muted text-fg-muted hover:text-fg"
                    }`}
                  >
                    #{prob.problemId} - {prob.title}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
              <span className="text-xs font-semibold uppercase text-fg-muted mr-1">Kết quả:</span>
              {VERDICT_FILTERS.map((f) => {
                const isSelected = (selectedResult || "") === f.value;
                return (
                  <Link
                    key={f.value}
                    href={buildSubmissionsHref({ result: f.value || null, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-fg"
                        : "bg-muted text-fg-muted hover:text-fg"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted font-medium text-fg-muted">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Thí sinh</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3">Kết quả</th>
                  <th className="px-4 py-3">Ngôn ngữ</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Bộ nhớ</th>
                  <th className="px-4 py-3">Thời gian nộp</th>
                  <th className="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissionsData.items.length === 0 ? (
                  <EmptyState variant="cell" colSpan={9}>Chưa có lượt nộp bài nào phù hợp bộ lọc.</EmptyState>
                ) : (
                  submissionsData.items.map((s, idx) => (
                    <tr key={s.SubmissionID} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-fg-muted font-mono text-xs">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">{s.FullName}</div>
                        <div className="text-xs text-fg-muted">@{s.Username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/teacher/problems/${s.ProblemID}`}
                          className="font-medium text-fg hover:text-primary hover:underline"
                        >
                          #{s.ProblemID} - {s.ProblemTitle}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <VerdictBadge value={s.Result as never} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.Language}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {s.Runtime !== null ? `${s.Runtime}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {s.Memory !== null ? `${(s.Memory / 1024).toFixed(1)}MB` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {new Date(s.SubmitTime).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/submissions/${s.SubmissionID}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Xem bài làm →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {submissionsData.total > PAGE_SIZE && (
            <div className="flex justify-center pt-2">
              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                total={submissionsData.total}
                buildHref={(p) => buildSubmissionsHref({ page: p })}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "comments" && (
        <div className="card p-6">
          <Comments
            target={{ kind: "contest", id: contestId }}
            currentUserId={actor.userId}
            canModerate={canManage}
            canComment={true}
            comments={rawComments.map(mapToCommentView)}
          />
        </div>
      )}
    </div>
  );
}
