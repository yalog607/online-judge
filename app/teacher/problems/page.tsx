import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { listForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { RowActions } from "./row-actions";

const PAGE_SIZE = 20;

export default async function ManageProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listForManage({
    actorId: actor.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: sp.difficulty as never,
    status: sp.status as never,
    page,
    pageSize: PAGE_SIZE,
    ownerOnly: sp.view === "mine",
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/teacher/problems?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Danh sách bài tập</h1>
          <p className="mt-1 text-fg-muted">Quản lý bài tập, lọc theo chủ đề, độ khó và trạng thái.</p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:opacity-90 transition-opacity"
        >
          + Tạo bài tập
        </Link>
      </div>

      <div className="flex gap-4 border-b border-line pb-2">
        <Link 
          href="/teacher/problems" 
          className={`font-medium pb-2 -mb-[9px] ${!sp.status && sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Tất cả
        </Link>
        <Link 
          href="/teacher/problems?view=mine" 
          className={`font-medium pb-2 -mb-[9px] ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Bài tập của tôi
        </Link>
        {actor.role !== "TA" && (
          <Link 
            href="/teacher/problems?status=Pending" 
            className={`font-medium pb-2 -mb-[9px] ${sp.status === 'Pending' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
          >
            Chờ duyệt
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-3 card p-3" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm kiếm tên bài tập..."
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        />
        <input
          name="tag"
          defaultValue={sp.tag}
          placeholder="Chủ đề (tag)..."
          className="min-w-[150px] rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        />
        <select
          name="difficulty"
          defaultValue={sp.difficulty ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Độ khó (Tất cả)</option>
          <option value="Easy">Dễ</option>
          <option value="Medium">Trung bình</option>
          <option value="Hard">Khó</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Trạng thái (Tất cả)</option>
          <option value="Public">Công khai</option>
          <option value="Private">Riêng tư</option>
          <option value="Hidden">Đã khóa</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Rejected">Đã từ chối</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg text-sm hover:opacity-90 transition-opacity">
          Tìm kiếm
        </button>
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
                return `/teacher/problems?${params.toString()}`;
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
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Tên bài</th>
              <th className="px-5 py-3">Tác giả</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.ProblemID} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 text-fg-muted">{p.ProblemID}</td>
                <td className="px-5 py-3 font-medium">
                  <Link href={`/teacher/problems/${p.ProblemID}`} className="hover:underline" title="Xem đề bài">
                    {p.Title}
                  </Link>
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
                      {p.Tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                        <Link
                          key={t}
                          href={`/teacher/problems?tag=${encodeURIComponent(t)}${sp.view === "mine" ? "&view=mine" : ""}${sp.status ? `&status=${sp.status}` : ""}`}
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
                  <div className="flex items-center justify-end">
                    <RowActions 
                      problemId={p.ProblemID} 
                      status={p.Status} 
                      creatorId={p.CreatorID}
                      actorId={actor.userId}
                      actorRole={actor.role}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-fg-muted">
                  Không có bài tập nào khớp bộ lọc.
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

