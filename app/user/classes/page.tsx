import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { JoinClassForm } from "./join-class-form";

export default async function UserClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole("User");
  const sp = await searchParams;

  const { classes } = await classRepository.listClasses({
    userId: user.userId,
    search: sp.q,
    page: 1,
    pageSize: 50,
  });

  const myClasses = classes.filter((c) => c.IsJoined);
  const otherClasses = classes.filter((c) => !c.IsJoined);

  return (
    <div className="flex flex-col gap-8 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Lớp học của tôi</h1>
        <p className="mt-1 text-fg-muted">
          Tham gia các lớp học của giảng viên để làm bài tập và theo dõi tiến độ học tập.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold">Tham gia lớp học mới</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Nhập mã mời được cung cấp bởi giảng viên để tham gia vào lớp.
        </p>
        <JoinClassForm />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Lớp học bạn đã tham gia ({myClasses.length})</h2>
        {myClasses.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-8 text-center text-fg-muted">
            Bạn chưa tham gia lớp học nào. Hãy nhập mã mời phía trên để tham gia lớp.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((c) => (
              <div
                key={c.ClassID}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 hover:border-fg-muted transition-colors"
              >
                <div>
                  <span className="text-xs font-medium text-primary">Đang tham gia</span>
                  <h3 className="mt-1 text-lg font-semibold text-fg">
                    <Link href={`/user/classes/${c.ClassID}`} className="hover:underline">
                      {c.ClassName}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-fg-muted line-clamp-2">
                    {c.Description || "Không có mô tả."}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-3 text-xs text-fg-muted">
                  <span>GV: {c.TeacherName}</span>
                  <Link
                    href={`/user/classes/${c.ClassID}`}
                    className="font-medium text-fg hover:underline"
                  >
                    Vào lớp →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {otherClasses.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Các lớp học khác ({otherClasses.length})</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherClasses.map((c) => (
              <div
                key={c.ClassID}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5"
              >
                <div>
                  <span className="text-xs font-medium text-fg-muted">
                    {c.IsPublic ? "Lớp học công khai" : "Lớp học riêng tư"}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-fg">{c.ClassName}</h3>
                  <p className="mt-1 text-sm text-fg-muted line-clamp-2">
                    {c.Description || "Không có mô tả."}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-3 text-xs text-fg-muted">
                  <span>GV: {c.TeacherName}</span>
                  <span className="font-medium text-fg-muted">{c.StudentCount} học sinh</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
