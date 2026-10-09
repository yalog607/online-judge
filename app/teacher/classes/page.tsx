import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";

const PAGE_SIZE = 20;

export default async function TeacherClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { classes, totalCount } = await classRepository.listClasses({
    userId: actor.userId,
    search: sp.q,
    onlyMine: sp.view === "mine",
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lớp học</h1>
          <p className="mt-1 text-fg-muted">Quản lý các lớp học bạn đang giảng dạy.</p>
        </div>
        <Link
          href="/teacher/classes/new"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:opacity-90"
        >
          + Tạo lớp học
        </Link>
      </div>

      <div className="flex gap-4 border-b border-line pb-2">
        <Link 
          href="/teacher/classes" 
          className={`font-medium pb-2 -mb-[9px] ${sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Tất cả
        </Link>
        <Link 
          href="/teacher/classes?view=mine" 
          className={`font-medium pb-2 -mb-[9px] ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Lớp học của tôi
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 card p-3" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo tên lớp học..."
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-muted px-3 py-2 text-fg"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg">
          Tìm kiếm
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-muted text-fg-muted font-medium">
            <tr>
              <th className="px-4 py-3">Tên lớp</th>
              <th className="px-4 py-3">Mã mời</th>
              <th className="px-4 py-3">Sĩ số</th>
              <th className="px-4 py-3">Chế độ</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                  Bạn chưa có lớp học nào. Hãy tạo lớp mới để bắt đầu.
                </td>
              </tr>
            ) : (
              classes.map((c) => (
                <tr key={c.ClassID} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-fg">
                    <Link href={`/teacher/classes/${c.ClassID}`} className="hover:underline">
                      {c.ClassName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono bg-muted px-2 py-0.5 rounded border border-line font-semibold text-primary">
                      {c.InviteCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.StudentCount} học sinh</td>
                  <td className="px-4 py-3">
                    {c.IsPublic ? (
                      <span className="text-ok">Công khai</span>
                    ) : (
                      <span className="text-fg-muted">Riêng tư</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {new Date(c.CreatedAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/teacher/classes/${c.ClassID}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={totalCount}
        buildHref={(p) => {
          const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
          return `/teacher/classes?${params.toString()}`;
        }}
      />
    </div>
  );
}
