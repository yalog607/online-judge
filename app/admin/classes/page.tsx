import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { DataTable } from "@/components/data-table";
import { Badge, ClassActiveBadge } from "@/components/badge";
import { paginate, pageHrefBuilder, parsePage } from "@/lib/paginate";

const PAGE_SIZE = 20;

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Admin");
  const sp = await searchParams;

  const { classes } = await classRepository.listClasses({
    userId: actor.userId,
    search: sp.q,
    onlyMine: false,
    page: 1,
    pageSize: 500,
  });
  // Lớp chưa được duyệt chỉ xuất hiện ở trang "Duyệt yêu cầu".
  const approved = classes.filter((c) => c.ApprovalStatus === "Approved");
  const paged = paginate(approved, parsePage(sp.page), PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <PageHeader
        title="Danh sách lớp học"
        badge={
          <span className="rounded-full border border-line bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            Chỉ xem
          </span>
        }
        description="Theo dõi các lớp học đã được duyệt trong hệ thống (không chỉnh sửa)."
      />

      <form className="card flex flex-wrap items-center gap-2 p-4" method="get">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo tên lớp hoặc giảng viên..."
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity"
        >
          Tìm
        </button>
        <Link
          href="/admin/classes"
          className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors"
        >
          Xóa lọc
        </Link>
      </form>

      <DataTable
        columns={[
          { label: "Tên lớp" },
          { label: "Giảng viên" },
          { label: "Học viên" },
          { label: "Trạng thái" },
          { label: "Thao tác", align: "right" },
        ]}
      >
        {paged.items.length === 0 ? (
          <EmptyState variant="cell" colSpan={5}>
            Không tìm thấy lớp học nào phù hợp.
          </EmptyState>
        ) : (
          paged.items.map((c) => (
            <tr key={c.ClassID} className="hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/admin/classes/${c.ClassID}`} className="font-semibold text-fg hover:underline">
                  {c.ClassName}
                </Link>
                {c.Description && <p className="mt-0.5 text-xs text-fg-muted line-clamp-1">{c.Description}</p>}
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">
                <div className="font-medium text-fg">{c.TeacherName}</div>
                <div>{c.TeacherEmail}</div>
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">{c.StudentCount} học viên</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge kind={c.IsPublic ? "ok" : "warn"}>{c.IsPublic ? "Công khai" : "Cần duyệt"}</Badge>
                  <ClassActiveBadge cancelled={c.IsCancelled} />
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/classes/${c.ClassID}`}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                >
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <Pager
        page={paged.page}
        pageSize={PAGE_SIZE}
        total={paged.total}
        buildHref={pageHrefBuilder(sp, "page")}
      />
    </div>
  );
}
