import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { ProblemForm } from "../../../teacher/problems/problem-form";
import { createProblemAction } from "@/modules/problem/actions";

export default async function NewProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const actor = await requireRole("TA", "Teacher", "Admin");

  let classes: { ClassID: number; ClassName: string }[] = [];
  if (actor.role === "TA") {
    classes = (await classRepository.getClassesForTA(actor.userId)).filter(
      (c) => !c.IsCancelled && c.ApprovalStatus === "Approved",
    );
  } else if (actor.role === "Teacher") {
    const res = await classRepository.listClasses({
      userId: actor.userId,
      onlyMine: true,
      page: 1,
      pageSize: 100,
    });
    classes = res.classes
      .filter((c) => !c.IsCancelled && c.ApprovalStatus === "Approved")
      .map((c) => ({ ClassID: c.ClassID, ClassName: c.ClassName }));
  } else if (actor.role === "Admin") {
    const res = await classRepository.listClasses({ page: 1, pageSize: 100 });
    classes = res.classes.map((c) => ({ ClassID: c.ClassID, ClassName: c.ClassName }));
  }

  const isTA = actor.role === "TA";
  const requestedClassId = Number((await searchParams).classId);
  const defaultClassId =
    isTA && classes.some((c) => c.ClassID === requestedClassId) ? requestedClassId : undefined;

  return (
    <div className="max-w-3xl pt-8">
      <Link
        href="/user/problems"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg mb-4"
      >
        ← Quay lại tất cả bài tập
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Thêm bài tập {isTA ? "(Bản nháp)" : ""}</h1>
      {isTA && (
        <p className="mb-4 text-sm text-fg-muted">
          Bài tập bạn tạo sẽ được đặt ở trạng thái &quot;Chờ duyệt&quot;. Giảng viên hoặc Quản trị
          viên cần duyệt trước khi hiển thị cho học viên.
        </p>
      )}
      {isTA && classes.length === 0 ? (
        <div className="card p-5 text-sm text-fg-muted">
          Bạn chưa là trợ giảng của lớp nào đang hoạt động nên chưa thể thêm bài tập. Hãy nhờ giảng viên
          gửi yêu cầu thăng cấp trợ giảng cho bạn.
        </div>
      ) : (
      <ProblemForm
        action={createProblemAction}
        classes={classes.map((c) => ({ ClassID: c.ClassID, ClassName: c.ClassName }))}
        isTA={isTA}
        defaultClassId={defaultClassId}
      />
      )}
    </div>
  );
}
