import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { ProblemForm } from "../problem-form";
import { createProblemAction } from "@/modules/problem/actions";

export default async function NewProblemPage() {
  const actor = await requireRole("Teacher", "Admin");
  const { classes } = await classRepository.listClasses({
    userId: actor.userId,
    onlyMine: true,
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="max-w-3xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Thêm bài tập</h1>
      <ProblemForm
        action={createProblemAction}
        classes={classes.map((c) => ({ ClassID: c.ClassID, ClassName: c.ClassName }))}
      />
    </div>
  );
}
