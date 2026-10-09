import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { ProblemForm } from "../../../teacher/problems/problem-form";
import { createProblemAction } from "@/modules/problem/actions";

export default async function NewProblemPage() {
  const actor = await requireRole("TA", "Teacher", "Admin");
  
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

  const isTA = actor.role === "TA";

  return (
    <div className="max-w-3xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Thêm bài tập {isTA ? "(Bản nháp)" : ""}</h1>
      {isTA && <p className="mb-4 text-sm text-fg-muted">Bài tập bạn tạo sẽ được đặt ở trạng thái &quot;Chờ duyệt&quot;. Giảng viên hoặc Quản trị viên cần duyệt trước khi hiển thị cho học sinh.</p>}
      <ProblemForm
        action={createProblemAction}
        classes={classes.map((c) => ({ ClassID: c.ClassID, ClassName: c.ClassName }))}
        isTA={isTA}
      />
    </div>
  );
}
