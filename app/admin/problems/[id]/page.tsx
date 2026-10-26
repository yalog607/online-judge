import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getProblem, listPublicTestcases } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { MathContent } from "@/components/math-content";

export default async function AdminProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("Admin");
  const { id } = await params;
  const problemId = Number(id);
  if (isNaN(problemId)) notFound();

  const problem = await getProblem(problemId);
  if (!problem) notFound();

  const examples = await listPublicTestcases(problemId);

  const tags = (problem.Tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/problems"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          ← Quay lại danh sách bài tập
        </Link>
        <span className="rounded-full bg-muted border border-line px-2.5 py-0.5 text-xs font-medium text-fg-muted">
          Quyền Quản trị viên: Chỉ xem
        </span>
      </div>

      <div className="card">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[22px] font-semibold tracking-tight">
              #{problem.ProblemID}. {problem.Title}
            </h1>
            <Link
              href={`/user/problems/${problem.ProblemID}?from=preview`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity shrink-0"
            >
              Làm thử bài này
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <DifficultyBadge value={problem.Difficulty} />
            <ProblemStatusBadge value={problem.Status} />
            <span>
              Giới hạn: {(problem.TimeLimit / 1000).toFixed(1)}s, {problem.MemoryLimit}MB
            </span>
            <span>• Người tạo: {problem.CreatorFullName}</span>
            {tags.map((t) => (
              <span key={t} className="rounded-md bg-muted px-2 py-px text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
}
