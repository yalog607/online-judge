import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { getProblem, listOwnerTestcases } from "@/modules/problem/repo";
import { updateProblemAction } from "@/modules/problem/actions";
import { ProblemForm } from "../../problem-form";

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const problemId = Number(id);
  const problem = await getProblem(problemId);
  if (!problem) notFound();
  if (actor.role !== "Admin" && problem.CreatorID !== actor.userId) notFound();

  const testcases = await listOwnerTestcases(problemId, actor.userId);

  return (
    <div className="max-w-3xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài tập</h1>
      <ProblemForm
        action={updateProblemAction.bind(null, problemId)}
        problem={problem}
        testcases={testcases}
      />
    </div>
  );
}
