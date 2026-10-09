import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getProblem, listPublicTestcases } from "@/modules/problem/repo";
import { listComments } from "@/modules/comment/repo";
import { DifficultyBadge } from "@/components/badge";
import { MathContent } from "@/components/math-content";
import { Comments, type CommentView } from "../../../user/problems/[id]/comments";

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

export default async function TeacherProblemPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const problemId = Number(id);
  const problem = await getProblem(problemId);
  if (!problem) notFound();

  const [examples, commentRows] = await Promise.all([
    listPublicTestcases(problemId),
    listComments(problemId, user.userId)
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
    authorRole: c.AuthorRole,
  }));
  const tags = (problem.Tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 pt-6">
      <Link
        href="/teacher/problems"
        className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg"
      >
        ← Quay lại danh sách
      </Link>
      <div className="card">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {problem.ProblemID}. {problem.Title}
            </h1>
            <Link
              href={`/user/problems/${problem.ProblemID}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
            >
              Làm thử bài này
            </Link>
          </div>
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

      <div className="card p-5">
        <h2 className="text-xl font-semibold mb-4">Bình luận & Thảo luận</h2>
        <Comments comments={comments} problemId={problemId} currentUserId={user.userId} canModerate={true} />
      </div>
    </div>
  );
}
