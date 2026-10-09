import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getProblem, listPublicTestcases, checkProblemAccess } from "@/modules/problem/repo";
import { listForUser as listSubmissions } from "@/modules/submission/repo";
import { contestRepository } from "@/modules/contest/repo";
import { listComments } from "@/modules/comment/repo";
import { DifficultyBadge, VerdictBadge } from "@/components/badge";
import { MathContent } from "@/components/math-content";
import { parseFunctionSpec } from "@/modules/problem/function-spec";
import { starterCode } from "@/modules/problem/harness";
import { SubmitForm } from "./submit-form";
import { ProblemTabs } from "./problem-tabs";
import { Comments, type CommentView } from "./comments";

function timeAgo(date: Date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export default async function ProblemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ contestId?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sParams = await searchParams;
  const problemId = Number(id);
  const contestId = sParams?.contestId ? Number(sParams.contestId) : undefined;
  const problem = await getProblem(problemId);
  if (!problem) notFound();

  let canAccessContest = false;
  let contestStatus: "Upcoming" | "Ongoing" | "Ended" | null = null;
  if (contestId) {
    canAccessContest = await contestRepository.checkProblemAccess(contestId, problemId, user.userId);
    if (canAccessContest) {
      const contest = await contestRepository.getContest(contestId, user.userId);
      contestStatus = contest?.status ?? null;
    }
  }

  const canAccessDirect = await checkProblemAccess(problemId, user.userId);
  const canAccess = canAccessDirect || canAccessContest;
  if (!canAccess) notFound();

  // Function-mode problems start the editor from a generated signature stub per language.
  const functionSpec = problem.JudgeMode === "function" ? parseFunctionSpec(problem.FunctionSpec) : null;
  const starters = functionSpec
    ? Object.fromEntries(
        ["cpp", "c", "java", "python", "javascript", "go", "csharp"].map((l) => [
          l,
          starterCode(l, functionSpec) ?? "",
        ]),
      )
    : undefined;

  const [examples, history, commentRows] = await Promise.all([
    listPublicTestcases(problemId),
    listSubmissions(user.userId, problemId, 1, 10),
    listComments(problemId, user.userId),
  ]);

  const comments: CommentView[] = commentRows.map((c) => ({
    id: c.CommentID,
    parentId: c.ParentID,
    userId: c.UserID,
    fullName: c.FullName,
    content: c.Content,
    timeAgo: timeAgo(new Date(c.CreatedAt)),
    likes: c.LikeCount,
    liked: c.LikedByMe,
  }));
  const tags = (problem.Tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const statement = (
    <div className="flex flex-col gap-4 whitespace-pre-wrap text-sm leading-relaxed">
      <MathContent content={problem.Statement} />
      {problem.InputFormat && (
        <div>
          <h3 className="font-semibold mb-1">Dữ liệu vào</h3>
          <MathContent content={problem.InputFormat} className="text-fg-muted" />
        </div>
      )}
      {problem.OutputFormat && (
        <div>
          <h3 className="font-semibold mb-1">Dữ liệu ra</h3>
          <MathContent content={problem.OutputFormat} className="text-fg-muted" />
        </div>
      )}
      {examples.map((ex, i) => (
        <div key={ex.TestCaseID} className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Ví dụ vào {examples.length > 1 ? i + 1 : ""}</h3>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-muted p-3.5 font-mono text-[13px] leading-relaxed">
              {ex.InputData}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Ví dụ ra {examples.length > 1 ? i + 1 : ""}</h3>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-muted p-3.5 font-mono text-[13px] leading-relaxed">
              {ex.ExpectedOutput}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );

  const submissions = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-fg-muted">
            <th className="px-5 py-3">Trạng thái</th>
            <th className="px-5 py-3">Ngôn ngữ</th>
            <th className="px-5 py-3">Thời gian</th>
            <th className="px-5 py-3">Lúc nộp</th>
          </tr>
        </thead>
        <tbody>
          {history.rows.map((s) => (
            <tr key={s.SubmissionID} className="border-t border-line hover:bg-muted">
              <td className="px-5 py-3">
                <Link href={`/submissions/${s.SubmissionID}`}>
                  <VerdictBadge value={s.Result} />
                </Link>
              </td>
              <td className="px-5 py-3">{s.Language}</td>
              <td className="px-5 py-3">{s.Runtime ? `${s.Runtime}ms` : "—"}</td>
              <td className="px-5 py-3 text-fg-muted">
                {new Date(s.SubmitTime).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
          {history.rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-fg-muted">
                Chưa có lượt nộp nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pt-6">
      <Link
        href={contestId ? `/user/contests/${contestId}` : "/user/problems"}
        className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg"
      >
        ← {contestId ? "Quay lại kỳ thi" : "Quay lại danh sách"}
      </Link>
      {contestId && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-medium text-primary">
          Đang làm bài cho Kỳ thi #{contestId}
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="rounded-xl bg-surface">
          <div className="border-b border-line px-5 py-4">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {problem.ProblemID}. {problem.Title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <DifficultyBadge value={problem.Difficulty} />
              <span>
                Giới hạn: {(problem.TimeLimit / 1000).toFixed(1)}s, {problem.MemoryLimit}MB
              </span>
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-muted px-2 py-px text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <ProblemTabs
            discussionCount={comments.length}
            statement={statement}
            discussion={
              <Comments
                problemId={problem.ProblemID}
                currentUserId={user.userId}
                canModerate={user.role !== "User"}
                comments={comments}
              />
            }
            history={submissions}
          />
        </div>

        {problem.Status === "Hidden" ? (
          <div className="rounded-xl border border-bad/30 bg-bad-soft p-4 text-center text-sm font-semibold text-bad">
            Bài tập này đã bị khóa. Không thể nộp bài.
          </div>
        ) : contestStatus === "Ended" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-semibold text-amber-500">
            Kỳ thi này đã kết thúc. Bạn chỉ có thể xem lại đề bài, không thể nộp bài làm.
          </div>
        ) : (
          <SubmitForm
            problemId={problem.ProblemID}
            contestId={canAccessContest ? contestId : undefined}
            starters={starters}
          />
        )}
      </div>
    </div>
  );
}
