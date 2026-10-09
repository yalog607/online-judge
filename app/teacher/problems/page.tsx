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
          <h1 className="text-2xl font-semibold">Bài tập</h1>
          <p className="mt-1 text-fg-muted">Quản lý bài tập bạn đã tạo.</p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg"
        >
          + Tạo bài tập
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 card p-3" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo tên bài..."
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-muted px-3 py-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Public">Công khai</option>
          <option value="Private">Riêng tư</option>
          <option value="Hidden">Đã khóa</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Rejected">Đã từ chối</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg">
          Tìm kiếm
        </button>
      </form>

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

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fg-muted">
              <th className="px-5 py-3">Tên bài</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.ProblemID} className="border-b border-line last:border-0">
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
                <td className="px-5 py-3 text-fg-muted">{p.Tags}</td>
                <td className="px-5 py-3">
                  <DifficultyBadge value={p.Difficulty} />
                </td>
                <td className="px-5 py-3">
                  <ProblemStatusBadge value={p.Status} />
                </td>
                <td className="px-5 py-3">
                  <RowActions 
                    problemId={p.ProblemID} 
                    status={p.Status} 
                    creatorId={p.CreatorID}
                    actorId={actor.userId}
                    actorRole={actor.role}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-fg-muted">
                  Chưa có bài tập nào.
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
