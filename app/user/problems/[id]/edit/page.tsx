
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { getProblem, listOwnerTestcases } from "@/modules/problem/repo";
import { updateProblemAction } from "@/modules/problem/actions";
import { ProblemForm } from "../../../../teacher/problems/problem-form";

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("TA", "Teacher", "Admin");
  const { id } = await params;
  const problemId = Number(id);
  const problem = await getProblem(problemId);
  if (!problem) notFound();
  if (actor.role !== "Admin" && problem.CreatorID !== actor.userId) notFound();

  let classes: { ClassID: number; ClassName: string }[] = [];
  if (actor.role === "TA") {
    classes = await classRepository.getClassesForTA(actor.userId);
  } else if (actor.role === "Teacher") {
    const res = await classRepository.listClasses({ userId: actor.userId, onlyMine: true, page: 1, pageSize: 100 });
    classes = res.classes.map(c => ({ ClassID: c.ClassID, ClassName: c.ClassName }));
  } else if (actor.role === "Admin") {
    const res = await classRepository.listClasses({ page: 1, pageSize: 100 });
    classes = res.classes.map(c => ({ ClassID: c.ClassID, ClassName: c.ClassName }));
  }

  const testcases = await listOwnerTestcases(problemId, actor.userId);
  const isTA = actor.role === "TA";
  const isDisabled = isTA && problem.Status !== "Pending" && problem.Status !== "Rejected";

  return (
    <div className="max-w-3xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài tập {isTA ? "(Bản nháp)" : ""}</h1>
      
      {isTA && problem.Status === "Pending" && (
        <p className="mb-4 text-sm text-fg-muted">
          Bài tập của bạn đang ở trạng thái &quot;Chờ duyệt&quot;. Giảng viên hoặc Quản trị viên cần duyệt trước khi hiển thị cho học sinh.
        </p>
      )}

      {isTA && problem.Status === "Rejected" && (
        <div className="mb-4 rounded-lg bg-bad-soft p-4 text-sm text-bad">
          <p className="font-semibold mb-1">Bài tập đã bị từ chối!</p>
          <p>Lý do: {problem.RejectionReason || "Không có lý do."}</p>
          <p className="mt-2 opacity-80">Bạn có thể sửa lại bài tập và lưu để tiếp tục chờ duyệt.</p>
        </div>
      )}

      {isDisabled && (
        <div className="mb-4 rounded-lg bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold mb-1">Không thể sửa bài tập này</p>
          <p>Bài tập đã được duyệt hoặc không còn ở trạng thái chờ. Bạn chỉ có thể xem nội dung.</p>
        </div>
      )}

      <ProblemForm
        action={updateProblemAction.bind(null, problemId)}
        problem={problem}
        testcases={testcases}
        classes={classes}
        isTA={isTA}
        disabled={isDisabled}
      />
    </div>
  );
}
