import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getSubmission } from "@/modules/submission/repo";
import { VerdictBadge } from "@/components/badge";
import { SubmissionLive } from "@/components/submission-live";
import { DomainError } from "@/db/exec";
import { RejudgeButton } from "./rejudge-button";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  let detail, testcases;
  try {
    ({ detail, testcases } = await getSubmission(Number(id), user.userId));
  } catch (e) {
    if (e instanceof DomainError) notFound();
    throw e;
  }
  if (!detail) notFound();

  const isPending = detail.Result === "Pending" || detail.Result === "Judging";

  return (
    <div className="flex flex-col gap-6 pt-8">
      {isPending && <SubmissionLive submissionId={detail.SubmissionID} />}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/user/problems/${detail.ProblemID}`}
            className="text-sm text-fg-muted underline"
          >
            ← {detail.ProblemTitle}
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Bài nộp #{detail.SubmissionID}</h1>
            {["Teacher", "Admin", "TA"].includes(user.role) && (
              <RejudgeButton submissionId={detail.SubmissionID} />
            )}
          </div>
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
          <div key={label} className="rounded-xl bg-surface p-4">
            <div className="text-sm text-fg-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-surface p-4">
          <h2 className="mb-3 font-semibold">Mã nguồn</h2>
          <pre className="overflow-x-auto rounded-lg bg-code-bg p-4 font-mono text-xs">
            {detail.SourceCode}
          </pre>
        </div>
        <div className="rounded-xl bg-surface">
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
              {testcases.map((t, i) => (
                <tr key={t.TestCaseID} className="border-t border-line">
                  <td className="px-4 py-2">
                    #{i + 1} {t.IsHidden && <span className="text-xs text-fg-muted">(ẩn)</span>}
                  </td>
                  <td className="px-4 py-2">
                    <VerdictBadge value={t.Verdict} />
                  </td>
                  <td className="px-4 py-2">{t.Runtime ? `${t.Runtime} ms` : "—"}</td>
                </tr>
              ))}
              {testcases.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-fg-muted">
                    Đang chờ chấm…
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
