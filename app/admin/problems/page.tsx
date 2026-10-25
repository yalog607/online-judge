import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/dal";
import { listForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { DataTable } from "@/components/data-table";
import {
  SearchForm,
  TagFilterChip,
  searchInputClass,
  tagInputClass,
  filterControlClass,
} from "@/components/search-form";

const PAGE_SIZE = 20;

export default async function AdminProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listForManage({
    actorId: actor.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: (sp.difficulty || undefined) as never,
    status: (sp.status || undefined) as never,
    page,
    pageSize: PAGE_SIZE,
    ownerOnly: false,
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/admin/problems?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 pt-8">
      <PageHeader
        title="Danh sách bài tập"
        badge={
          <span className="rounded-full border border-line bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            Chỉ xem
          </span>
        }
        description="Tra cứu và xem chi tiết bài tập trong hệ thống (không chỉnh sửa)."
      />

      <SearchForm sp={sp} hidden={{}} resetHref={"/admin/problems"}>
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo mã hoặc tên bài tập..."
          className={searchInputClass}
        />
        <input
          name="tag"
          defaultValue={sp.tag}
          placeholder="Chủ đề (tag)..."
          className={tagInputClass}
        />
        <select name="difficulty" defaultValue={sp.difficulty ?? ""} className={filterControlClass}>
          <option value="">Độ khó: Tất cả</option>
          <option value="Easy">Độ khó: Dễ</option>
          <option value="Medium">Độ khó: Trung bình</option>
          <option value="Hard">Độ khó: Khó</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={filterControlClass}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="Public">Trạng thái: Công khai</option>
          <option value="Private">Trạng thái: Riêng tư</option>
          <option value="Hidden">Trạng thái: Đã khóa</option>
          <option value="Pending">Trạng thái: Chờ duyệt</option>
          <option value="Rejected">Trạng thái: Đã từ chối</option>
        </select>
      </SearchForm>

      <TagFilterChip tag={sp.tag} sp={sp} basePath="/admin/problems" />

      <DataTable
        columns={[
          { label: "Mã" },
          { label: "Tên bài" },
          { label: "Người tạo" },
          { label: "Chủ đề" },
          { label: "Độ khó" },
          { label: "Trạng thái" },
          { label: "Thao tác", align: "right" },
        ]}
        footer={<Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />}
      >
        {rows.map((p) => (
          <tr key={p.ProblemID} className="hover:bg-muted/40 transition-colors">
            <td className="whitespace-nowrap px-5 py-3 text-fg-muted">{p.ProblemCode}</td>
            <td className="px-5 py-3 font-medium">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/problems/${p.ProblemID}`}
                  className="hover:underline font-semibold"
                  title="Xem đề bài"
                >
                  {p.Title}
                </Link>
              </div>
            </td>
            <td className="px-5 py-3 text-fg-muted">{p.CreatorFullName ?? "-"}</td>
            <td className="px-5 py-3 text-fg-muted">
              {p.Tags ? (
                <div className="flex flex-wrap gap-1">
                  {p.Tags.split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <Link
                        key={t}
                        href={`/admin/problems?tag=${encodeURIComponent(t)}${sp.status ? `&status=${sp.status}` : ""}`}
                        className="inline-block rounded bg-muted hover:bg-primary/10 hover:text-primary px-1.5 py-0.5 text-xs text-fg-muted transition-colors border border-line/50"
                      >
                        {t}
                      </Link>
                    ))}
                </div>
              ) : (
                <span className="text-fg-subtle text-xs">-</span>
              )}
            </td>
            <td className="px-5 py-3">
              <DifficultyBadge value={p.Difficulty} />
            </td>
            <td className="px-5 py-3">
              <ProblemStatusBadge value={p.Status} />
            </td>
            <td className="px-5 py-3 text-right">
              <Link
                href={`/admin/problems/${p.ProblemID}`}
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted transition-colors"
              >
                Xem
              </Link>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <EmptyState variant="cell" colSpan={7}>
            Không tìm thấy bài tập nào.
          </EmptyState>
        )}
      </DataTable>
    </div>
  );
}
