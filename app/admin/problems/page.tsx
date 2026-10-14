import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { listForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";

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

  const statusTabs = [
    { label: "Tất cả", value: "" },
    { label: "Công khai", value: "Public" },
    { label: "Chờ duyệt", value: "Pending" },
    { label: "Riêng tư", value: "Private" },
    { label: "Đã khóa", value: "Hidden" },
  ];

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold">Danh sách bài tập</h1>
            <span className="rounded-full bg-muted border border-line px-2.5 py-0.5 text-xs font-medium text-fg-muted">
              Chỉ xem
            </span>
          </div>
          <p className="mt-1 text-fg-muted">Tra cứu và xem chi tiết bài tập trong hệ thống (không chỉnh sửa).</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-line pb-2 overflow-x-auto">
        {statusTabs.map((tab) => {
          const isActive = (sp.status || "") === tab.value;
          const params = new URLSearchParams(sp as Record<string, string>);
          if (tab.value) {
            params.set("status", tab.value);
          } else {
            params.delete("status");
          }
          params.delete("page");

          return (
            <Link
              key={tab.value}
              href={`/admin/problems?${params.toString()}`}
              className={`font-medium pb-2 -mb-[9px] text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form
        key={new URLSearchParams(sp as Record<string, string>).toString()}
        className="flex gap-2.5 card p-2.5 overflow-x-auto items-center scrollbar-hide"
        method="get"
      >
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm kiếm tên bài tập..."
          className="min-w-[140px] flex-1 rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        />
        <input
          name="tag"
          defaultValue={sp.tag}
          placeholder="Chủ đề (tag)..."
          className="min-w-[110px] w-[110px] rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        />
        <select
          name="difficulty"
          defaultValue={sp.difficulty ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Độ khó: Tất cả</option>
          <option value="Easy">Độ khó: Dễ</option>
          <option value="Medium">Độ khó: Trung bình</option>
          <option value="Hard">Độ khó: Khó</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Trạng thái: Tất cả</option>
          <option value="Public">Trạng thái: Công khai</option>
          <option value="Private">Trạng thái: Riêng tư</option>
          <option value="Hidden">Trạng thái: Đã khóa</option>
          <option value="Pending">Trạng thái: Chờ duyệt</option>
          <option value="Rejected">Trạng thái: Đã từ chối</option>
        </select>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg text-sm hover:opacity-90 transition-opacity"
        >
          Tìm kiếm
        </button>
        <Link
          href="/admin/problems"
          className="shrink-0 rounded-lg border border-line bg-muted px-4 py-2 font-medium text-fg text-sm hover:bg-muted/80 transition-colors"
        >
          Xóa lọc
        </Link>
      </form>

      {sp.tag && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">Đang lọc theo chủ đề:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary border border-primary/20">
            #{sp.tag}
            <Link
              href={(() => {
                const params = new URLSearchParams(sp as Record<string, string>);
                params.delete("tag");
                return `/admin/problems?${params.toString()}`;
              })()}
              className="hover:opacity-75 font-bold ml-1"
            >
              ✕
            </Link>
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fg-muted bg-muted font-medium">
              <th className="px-5 py-3">STT</th>
              <th className="px-5 py-3">Tên bài</th>
              <th className="px-5 py-3">Người tạo</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p, i) => (
              <tr key={p.ProblemID} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 text-fg-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-5 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/problems/${p.ProblemID}`}
                      className="hover:underline font-semibold"
                      title="Xem đề bài"
                    >
                      {p.Title}
                    </Link>
                    <span className="text-[10px] text-fg-muted font-normal px-1.5 py-0.5 bg-muted rounded border border-line/50">
                      #{p.ProblemID}
                    </span>
                  </div>
                  {p.ClassName && (
                    <div className="mt-1 text-xs text-fg-muted font-normal">
                      Lớp: {p.ClassName}
                    </div>
                  )}
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
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-fg-muted">
                  Không tìm thấy bài tập nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </div>
    </div>
  );
}
