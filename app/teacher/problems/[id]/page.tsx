import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { checkProblemAccess, getProblem, listPublicTestcases, getProblemSubmissions } from "@/modules/problem/repo";
import { DifficultyBadge, VerdictBadge } from "@/components/badge";
import { MathContent } from "@/components/math-content";
import { StatCard } from "@/components/stat-card";
import { Pager } from "@/components/pager";

export default async function TeacherProblemPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; page?: string; result?: string }>;
}) {
  const user = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const sParams = await searchParams;
  const problemId = Number(id);
  const activeTab = sParams?.tab === "submissions" ? "submissions" : "statement";
  const problem = await getProblem(problemId);
  if (!problem) notFound();
  if (!(await checkProblemAccess(problemId, user.userId))) notFound();
  const canEdit =
    user.role === "Admin" ||
    problem.CreatorID === user.userId ||
    (user.role === "Teacher" && problem.TeacherID === user.userId);

  const page = Math.max(1, Number(sParams?.page) || 1);
  const selectedResult = sParams?.result || undefined;
  const PAGE_SIZE = 20;

  const [examples, submissionsData] = await Promise.all([
    listPublicTestcases(problemId),
    activeTab === "submissions"
      ? getProblemSubmissions(problemId, user.userId, page, PAGE_SIZE, selectedResult)
      : Promise.resolve({
          summary: { TotalSubmissions: 0, SolvedUsers: 0, AttemptedUsers: 0, AcRate: 0 },
          items: [],
          total: 0,
        }),
  ]);

  const tags = (problem.Tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const buildHref = (p: number) => {
    const query = new URLSearchParams();
    query.set("tab", "submissions");
    query.set("page", String(p));
    if (selectedResult) query.set("result", selectedResult);
    return `/teacher/problems/${problemId}?${query.toString()}`;
  };

  const VERDICT_FILTERS = [
    { label: "Tất cả", value: "" },
    { label: "AC", value: "AC" },
    { label: "WA", value: "WA" },
    { label: "TLE", value: "TLE" },
    { label: "MLE", value: "MLE" },
    { label: "RE", value: "RE" },
    { label: "CE", value: "CE" },
  ];

  return (
    <div className="flex flex-col gap-5 pt-6">
      <Link
        href="/teacher/problems"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        ← Quay lại ngân hàng bài tập
      </Link>

      <div className="card">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {problem.ProblemID}. {problem.Title}
            </h1>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Link
                  href={`/teacher/problems/${problem.ProblemID}/edit`}
                  className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-muted"
                >
                  Chỉnh sửa bài
                </Link>
              )}
              {problem.Status === "Hidden" ? (
                <span className="rounded-lg border border-bad/30 bg-bad-soft px-4 py-2 text-sm font-medium text-bad">
                  Bài đã khóa
                </span>
              ) : (
                <Link
                  href={`/user/problems/${problem.ProblemID}?from=preview`}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
                >
                  Làm thử bài này
                </Link>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <DifficultyBadge value={problem.Difficulty} />
            <span>
              Người tạo: {problem.CreatorFullName ?? "Hệ thống"}
            </span>
            <span className="text-line">|</span>
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

        <div className="flex border-b border-line px-5 gap-6">
          <Link
            href={`/teacher/problems/${problemId}?tab=statement`}
            className={`pb-3 pt-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "statement"
                ? "border-primary text-primary"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            Đề bài & Ví dụ
          </Link>
          <Link
            href={`/teacher/problems/${problemId}?tab=submissions`}
            className={`pb-3 pt-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "submissions"
                ? "border-primary text-primary"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            Danh sách nộp bài
          </Link>
        </div>

        {activeTab === "statement" && (
          <div className="p-5 flex flex-col gap-4 whitespace-pre-wrap text-sm leading-relaxed">
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
              <div key={ex.TestCaseID} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        )}

        {activeTab === "submissions" && (
          <div className="p-5 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon="send"
                label="Tổng lượt nộp"
                value={submissionsData.summary.TotalSubmissions}
              />
              <StatCard
                icon="check"
                label="Học viên giải đúng (AC)"
                value={submissionsData.summary.SolvedUsers}
                tone="up"
              />
              <StatCard
                icon="users"
                label="Học viên đã nộp bài"
                value={submissionsData.summary.AttemptedUsers}
              />
              <StatCard
                icon="chart"
                label="Tỉ lệ hoàn thành"
                value={`${submissionsData.summary.AcRate}%`}
                tone={submissionsData.summary.AcRate >= 50 ? "up" : "down"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
              <span className="text-xs font-semibold uppercase text-fg-muted mr-2">Kết quả:</span>
              {VERDICT_FILTERS.map((f) => {
                const isActive = (selectedResult || "") === f.value;
                const query = new URLSearchParams();
                query.set("tab", "submissions");
                if (f.value) query.set("result", f.value);
                return (
                  <Link
                    key={f.value}
                    href={`/teacher/problems/${problemId}?${query.toString()}`}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-fg"
                        : "bg-muted text-fg-muted hover:text-fg"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-muted font-medium text-fg-muted">
                  <tr>
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">Học viên</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3">Ngôn ngữ</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Bộ nhớ</th>
                    <th className="px-4 py-3">Thời gian nộp</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {submissionsData.items.length === 0 ? (
                    <EmptyState variant="cell" colSpan={8}>Chưa có học viên nào nộp bài tập này.</EmptyState>
                  ) : (
                    submissionsData.items.map((s, idx) => (
                      <tr key={s.SubmissionID} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-fg-muted">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{s.FullName}</div>
                          <div className="text-xs text-fg-muted">@{s.Username}</div>
                        </td>
                        <td className="px-4 py-3">
                          <VerdictBadge value={s.Result as never} />
                        </td>
                        <td className="px-4 py-3">{s.Language}</td>
                        <td className="px-4 py-3">
                          {s.Runtime !== null ? `${s.Runtime}ms` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.Memory !== null ? `${s.Memory.toFixed(1)}MB` : "—"}
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {new Date(s.SubmitTime).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/submissions/${s.SubmissionID}?from=preview`}
                            className="text-xs font-semibold text-primary hover:underline"
                            target="_blank"
                          >
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {submissionsData.total > PAGE_SIZE && (
              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                total={submissionsData.total}
                buildHref={buildHref}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
