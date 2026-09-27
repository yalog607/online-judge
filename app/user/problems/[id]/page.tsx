import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getProblem, listPublicTestcases } from "@/modules/problem/repo";
import { listForUser as listSubmissions } from "@/modules/submission/repo";
import { DifficultyBadge, VerdictBadge } from "@/components/badge";
import { SubmitForm } from "./submit-form";

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const problemId = Number(id);
  const problem = await getProblem(problemId);
  if (!problem || problem.Status !== "Public") notFound();

  const [examples, history] = await Promise.all([
    listPublicTestcases(problemId),
    listSubmissions(user.userId, problemId, 1, 10),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-2">
      <div className="rounded-xl bg-surface p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">
            {problem.ProblemID}. {problem.Title}
          </h1>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          <DifficultyBadge value={problem.Difficulty} />
          <span>
            Giới hạn: {(problem.TimeLimit / 1000).toFixed(1)}s, {problem.MemoryLimit}MB
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-4 whitespace-pre-wrap text-sm leading-relaxed">
          <p>{problem.Statement}</p>
          {problem.InputFormat && (
            <div>
              <h3 className="font-semibold">Dữ liệu vào</h3>
              <p className="text-fg-muted">{problem.InputFormat}</p>
            </div>
          )}
          {problem.OutputFormat && (
            <div>
              <h3 className="font-semibold">Dữ liệu ra</h3>
              <p className="text-fg-muted">{problem.OutputFormat}</p>
            </div>
          )}
          {examples.map((ex, i) => (
            <div key={ex.TestCaseID} className="grid grid-cols-2 gap-3">
              <div>
                <h3 className="font-semibold">Ví dụ vào {i + 1}</h3>
                <pre className="mt-1 rounded-lg bg-code-bg p-3 font-mono text-xs">
                  {ex.InputData}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold">Ví dụ ra {i + 1}</h3>
                <pre className="mt-1 rounded-lg bg-code-bg p-3 font-mono text-xs">
                  {ex.ExpectedOutput}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SubmitForm problemId={problem.ProblemID} />
        <div className="rounded-xl bg-surface">
          <div className="border-b border-line px-5 py-3 font-semibold">Lịch sử nộp bài</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-muted">
                <th className="px-5 py-2">Trạng thái</th>
                <th className="px-5 py-2">Ngôn ngữ</th>
                <th className="px-5 py-2">Thời gian</th>
                <th className="px-5 py-2">Lúc nộp</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.map((s) => (
                <tr key={s.SubmissionID} className="border-t border-line hover:bg-muted">
                  <td className="px-5 py-2">
                    <Link href={`/submissions/${s.SubmissionID}`}>
                      <VerdictBadge value={s.Result} />
                    </Link>
                  </td>
                  <td className="px-5 py-2">{s.Language}</td>
                  <td className="px-5 py-2">{s.Runtime ? `${s.Runtime}ms` : "—"}</td>
                  <td className="px-5 py-2 text-fg-muted">
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
      </div>
    </div>
  );
}
