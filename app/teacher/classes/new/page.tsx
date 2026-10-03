import { requireRole } from "@/lib/dal";
import { CreateClassForm } from "./create-class-form";

export default async function NewClassPage() {
  await requireRole("Teacher", "Admin");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Tạo lớp học mới</h1>
        <p className="mt-1 text-fg-muted">
          Thiết lập thông tin lớp học và mã mời để học sinh có thể tham gia.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <CreateClassForm />
      </div>
    </div>
  );
}
