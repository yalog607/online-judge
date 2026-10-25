import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { ClassListTable } from "@/components/class-list-table";
import { SearchForm, filterControlClass, searchInputClass } from "@/components/search-form";
import { Select } from "@/components/select";
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
  const approved = classes.filter((c) => {
    if (c.ApprovalStatus !== "Approved") return false;
    if (sp.state === "active" && c.IsCancelled) return false;
    if (sp.state === "cancelled" && !c.IsCancelled) return false;
    if (sp.access === "public" && !c.IsPublic) return false;
    if (sp.access === "approval" && c.IsPublic) return false;
    return true;
  });
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

      <SearchForm sp={sp} resetHref="/admin/classes">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo mã, tên lớp hoặc giảng viên..."
          className={searchInputClass}
        />
        <Select name="state" label="Trạng thái" defaultValue={sp.state ?? ""} className={filterControlClass}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="cancelled">Đã hủy</option></Select>
        <Select name="access" label="Phạm vi" defaultValue={sp.access ?? ""} className={filterControlClass}><option value="">Tất cả phạm vi</option><option value="public">Công khai</option><option value="approval">Cần duyệt</option></Select>
      </SearchForm>

      <ClassListTable classes={paged.items} hrefPrefix="/admin/classes" relationLabel={() => "Toàn hệ thống"} empty="Không tìm thấy lớp học nào phù hợp." />

      <Pager
        page={paged.page}
        pageSize={PAGE_SIZE}
        total={paged.total}
        buildHref={pageHrefBuilder(sp, "page")}
      />
    </div>
  );
}
