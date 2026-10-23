import Link from "next/link";
import { ClassListTable } from "@/components/class-list-table";
import { JoinClassForm } from "@/components/join-class-form";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/pager";
import { SearchForm, filterControlClass, searchInputClass } from "@/components/search-form";
import { Select } from "@/components/select";
import { requireRole } from "@/lib/dal";
import { pageHrefBuilder, paginate, parsePage } from "@/lib/paginate";
import { classRepository } from "@/modules/class/repo";

const PAGE_SIZE = 20;

export default async function UserClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  const sp = await searchParams;
  const view = sp.view === "ta" || sp.view === "other" ? sp.view : "joined";
  const { classes } = await classRepository.listClasses({ userId: user.userId, search: sp.q, page: 1, pageSize: 500 });
  const groups = {
    ta: classes.filter((item) => item.IsTA),
    joined: classes.filter((item) => item.IsJoined && !item.IsTA),
    other: classes.filter((item) => !item.IsJoined && !item.IsTA),
  };
  const filtered = groups[view].filter((item) => {
    if (sp.state === "active" && item.IsCancelled) return false;
    if (sp.state === "cancelled" && !item.IsCancelled) return false;
    if (sp.access === "public" && !item.IsPublic) return false;
    if (sp.access === "approval" && item.IsPublic) return false;
    return true;
  });
  const paged = paginate(filtered, parsePage(sp.page), PAGE_SIZE);
  const tabHref = (target: string) => `/user/classes${target === "joined" ? "" : `?view=${target}`}`;

  return (
    <div className="flex flex-col gap-6 pt-8">
      <PageHeader title="Lớp học của tôi" description="Tham gia lớp học, tìm kiếm và theo dõi trạng thái trong cùng một danh sách." />
      <div className="card p-5"><h2 className="mb-2 font-semibold">Tham gia lớp bằng mã mời</h2><JoinClassForm /></div>
      <nav aria-label="Nhóm lớp học" className="flex gap-5 overflow-x-auto border-b border-line pb-2">
        {[["joined", "Đã tham gia", groups.joined.length], ["ta", "Lớp phụ trách", groups.ta.length], ["other", "Lớp khác", groups.other.length]].map(([value, label, count]) => (
          <Link key={String(value)} href={tabHref(String(value))} className={`-mb-[9px] whitespace-nowrap pb-2 font-medium ${view === value ? "border-b-2 border-primary text-primary" : "text-fg-muted hover:text-fg"}`}>
            {label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
          </Link>
        ))}
      </nav>
      <SearchForm sp={sp} hidden={{ view: view !== "joined" && view }} resetHref={tabHref(view)}>
        <input name="q" defaultValue={sp.q} placeholder="Tìm theo tên lớp hoặc giảng viên..." className={searchInputClass} />
        <Select name="state" label="Trạng thái" defaultValue={sp.state ?? ""} className={filterControlClass}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="cancelled">Đã hủy</option></Select>
        <Select name="access" label="Phạm vi" defaultValue={sp.access ?? ""} className={filterControlClass}><option value="">Tất cả phạm vi</option><option value="public">Công khai</option><option value="approval">Cần duyệt</option></Select>
      </SearchForm>
      <ClassListTable classes={paged.items} hrefPrefix="/user/classes" relationLabel={() => view === "ta" ? "Trợ giảng" : view === "joined" ? "Đã tham gia" : "Có thể tham gia"} empty="Không tìm thấy lớp học nào phù hợp." startIndex={(paged.page - 1) * PAGE_SIZE} />
      <Pager page={paged.page} pageSize={PAGE_SIZE} total={paged.total} buildHref={pageHrefBuilder(sp, "page")} />
    </div>
  );
}
