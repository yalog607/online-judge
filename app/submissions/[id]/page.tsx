import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getSubmission } from "@/modules/submission/repo";
import { listPublicTestcases } from "@/modules/problem/repo";
import { VerdictBadge } from "@/components/badge";
import { SubmissionLive } from "@/components/submission-live";
import { DomainError } from "@/db/exec";
import { RejudgeButton } from "./rejudge-button";

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ contestId?: string; classId?: string; from?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sParams = await searchParams;

  let detail, testcases;
  try {
    ({ detail, testcases } = await getSubmission(Number(id), user.userId));
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  if (!detail) notFound();

  const isPending = detail.Result === "Pending" || detail.Result === "Judging";
  const publicCases = new Map(
    (await listPublicTestcases(detail.ProblemID)).map((c) => [c.TestCaseID, c]),
  );
  const emptyMessage = isPending
    ? "Đang chờ chấm…"
    : detail.Result === "CE"
      ? "Lỗi biên dịch: mã nguồn không biên dịch được nên chưa chạy testcase nào."
      : detail.Result === "IE"
        ? "Lỗi hệ thống khi chấm bài, chưa có kết quả testcase."
        : "Không có kết quả testcase.";

  const rawContestId = sParams?.contestId ? Number(sParams.contestId) : (detail.ContestID ?? undefined);
  const contestId = rawContestId && !isNaN(rawContestId) ? rawContestId : undefined;
  const rawClassId = sParams?.classId ? Number(sParams.classId) : undefined;
  const classId = rawClassId && !isNaN(rawClassId) ? rawClassId : undefined;
  const from = sParams?.from;

  const problemQuery = new URLSearchParams();
  if (contestId) problemQuery.set("contestId", String(contestId));
  if (classId) problemQuery.set("classId", String(classId));
  if (from) problemQuery.set("from", from);
  const problemQueryStr = problemQuery.toString();

  const problemHref = (user.role === "Teacher" || user.role === "Admin") && !contestId && !classId && from !== "preview"
    ? `/teacher/problems/${detail.ProblemID}`
    : `/user/problems/${detail.ProblemID}${problemQueryStr ? `?${problemQueryStr}` : ""}`;

  const contestHref = user.role === "Admin"
    ? `/admin/contests/${contestId}`
    : user.role === "Teacher"
      ? `/teacher/contests/${contestId}`
      : `/user/contests/${contestId}`;

  return (
    <div className="flex flex-col gap-6 pt-8">
      {isPending && <SubmissionLive submissionId={detail.SubmissionID} />}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            {contestId ? (
              <>
                <Link
                  href={contestHref}
                  className="font-medium text-fg-muted hover:text-fg hover:underline"
                >
                  ← Quay lại kỳ thi
                </Link>
                <span>/</span>
                <Link
                  href={problemHref}
                  className="font-medium text-fg hover:underline"
                >
                  {detail.ProblemTitle}
                </Link>
              </>
            ) : classId ? (
              <>
                <Link
                  href={`/user/classes/${classId}`}
                  className="font-medium text-fg-muted hover:text-fg hover:underline"
                >
                  ← Quay lại lớp học
                </Link>
                <span>/</span>
                <Link
                  href={problemHref}
                  className="font-medium text-fg hover:underline"
                >
                  {detail.ProblemTitle}
                </Link>
              </>
            ) : from === "preview" ? (
              <>
                <Link
                  href={user.role === "Admin" ? `/admin/problems/${detail.ProblemID}` : `/teacher/problems/${detail.ProblemID}`}
                  className="font-medium text-fg-muted hover:text-fg hover:underline"
                >
                  ← Quay lại chi tiết bài tập
                </Link>
                <span>/</span>
                <Link
                  href={problemHref}
                  className="font-medium text-fg hover:underline"
                >
                  {detail.ProblemTitle}
                </Link>
              </>
            ) : (
              <Link
                href={problemHref}
                className="font-medium text-fg-muted hover:text-fg hover:underline"
              >
                ← {detail.ProblemTitle}
              </Link>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Bài nộp #{detail.SubmissionID}</h1>
            {["Teacher", "Admin", "TA"].includes(user.role) && (
              <RejudgeButton submissionId={detail.SubmissionID} />
            )}
          </div>
          {detail.UserID !== user.userId && detail.FullName && (
            <div className="mt-1 text-xs text-fg-muted">
              Học viên: <span className="font-medium text-fg">{detail.FullName}</span> (@{detail.Username})
            </div>
          )}
        </div>
        <VerdictBadge value={detail.Result} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Kết quả", detail.Result],
          ["Thời gian", detail.Runtime ? `${detail.Runtime} ms` : "—"],
          ["Số test qua", detail.PassedCases ?? "—"],
          ["Ngôn ngữ", detail.Language],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-sm text-fg-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Mã nguồn</h2>
          <pre className="overflow-x-auto rounded-lg bg-code-bg p-4 font-mono text-xs">
            {detail.SourceCode}
          </pre>
        </div>
        <div className="card">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Kết quả từng testcase</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-muted">
                <th className="px-4 py-2">Test</th>
                <th className="px-4 py-2">Kết quả</th>
                <th className="px-4 py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {testcases.map((t, i) => {
                const pub = !t.IsHidden ? publicCases.get(t.TestCaseID) : undefined;
                return (
                  <Fragment key={t.TestCaseID}>
                    <tr className="border-t border-line">
                      <td className="px-4 py-2">
                        #{i + 1} {t.IsHidden && <span className="text-xs text-fg-muted">(ẩn)</span>}
                      </td>
                      <td className="px-4 py-2">
                        <VerdictBadge value={t.Verdict} />
                      </td>
                      <td className="px-4 py-2">{t.Runtime ? `${t.Runtime} ms` : "—"}</td>
                    </tr>
                    {pub && (
                      <tr>
                        <td colSpan={3} className="px-4 pb-3">
                          <details className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs">
                            <summary className="cursor-pointer font-medium text-fg-muted">
                              Xem testcase công khai
                            </summary>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <div>
                                <div className="mb-1 text-fg-muted">Đầu vào</div>
                                <pre className="overflow-x-auto rounded bg-code-bg p-2 font-mono">{pub.InputData}</pre>
                              </div>
                              <div>
                                <div className="mb-1 text-fg-muted">Đầu ra mong đợi</div>
                                <pre className="overflow-x-auto rounded bg-code-bg p-2 font-mono">{pub.ExpectedOutput}</pre>
                              </div>
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {testcases.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-fg-muted">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
