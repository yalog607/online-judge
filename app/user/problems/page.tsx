import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { listForUser } from "@/modules/problem/repo";
import { DifficultyBadge, UserStatusBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";

const PAGE_SIZE = 20;

export default async function ProblemListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const isStaff = user.role === "TA" || user.role === "Teacher" || user.role === "Admin";
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listForUser({
    userId: user.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: (sp.difficulty || undefined) as never,
    userStatus: (sp.status || undefined) as never,
    problemStatus: (sp.problemStatus || undefined) as never,
    page,
    pageSize: PAGE_SIZE,
    ownerOnly: sp.view === "mine",
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/user/problems?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Danh sách bài tập</h1>
          <p className="mt-1 text-fg-muted">Chọn bài để luyện tập, lọc theo chủ đề và độ khó.</p>
        </div>
        {isStaff && (
          <Link
            href="/user/problems/new"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:bg-primary/90"
          >
            + Tạo bài tập
          </Link>
        )}
      </div>

      {isStaff && (
        <div className="flex gap-4 border-b border-line pb-2">
          <Link 
            href="/user/problems" 
            className={`font-medium pb-2 -mb-[9px] ${sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
          >
            Tất cả
          </Link>
          <Link 
            href="/user/problems?view=mine" 
            className={`font-medium pb-2 -mb-[9px] ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
          >
            Bài tập của tôi
          </Link>
        </div>
      )}

      <form key={new URLSearchParams(sp as Record<string, string>).toString()} className="flex gap-2.5 card p-2.5 overflow-x-auto items-center scrollbar-hide" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
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
        {isStaff && (
          <select
            name="problemStatus"
            defaultValue={sp.problemStatus ?? ""}
            className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
          >
            <option value="">Trạng thái bài: Tất cả</option>
            <option value="Public">Trạng thái bài: Công khai</option>
            <option value="Private">Trạng thái bài: Riêng tư</option>
            <option value="Hidden">Trạng thái bài: Đã khóa</option>
            <option value="Pending">Trạng thái bài: Chờ duyệt</option>
            <option value="Rejected">Trạng thái bài: Đã từ chối</option>
          </select>
        )}
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Trạng thái giải: Tất cả</option>
          <option value="done">Trạng thái giải: Đã giải</option>
          <option value="tried">Trạng thái giải: Đã thử</option>
          <option value="todo">Trạng thái giải: Chưa làm</option>
        </select>
        <button type="submit" className="shrink-0 rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg text-sm">
          Tìm kiếm
        </button>
        <Link
          href={`/user/problems${sp.view === "mine" ? "?view=mine" : ""}`}
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
                return `/user/problems?${params.toString()}`;
              })()}
              className="hover:opacity-75 font-bold ml-1"
            >
              ✕
            </Link>
          </span>
        </div>
      )}

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-sm text-fg-muted">
              <th className="px-5 py-3">STT</th>
              <th className="px-5 py-3">Tên bài</th>
              <th className="px-5 py-3">Người tạo</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              {isStaff && <th className="px-5 py-3">Trạng thái bài</th>}
              <th className="px-5 py-3">Tỉ lệ AC</th>
              <th className="px-5 py-3">Trạng thái giải</th>
              {sp.view === "mine" && <th className="px-5 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.ProblemID} className="border-b border-line last:border-0 hover:bg-muted">
                <td className="px-5 py-3">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/user/problems/${p.ProblemID}`}
                      className="font-medium hover:underline"
                    >
                      {p.Title}
                    </Link>
                    <span className="text-[10px] text-fg-muted font-normal px-1.5 py-0.5 bg-muted rounded border border-line/50">#{p.ProblemID}</span>
                  </div>
                  {p.ClassName && (
                    <div className="mt-1 text-xs text-fg-muted font-normal">
                      Lớp: {p.ClassName}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">{p.CreatorFullName ?? "-"}</td>
                <td className="px-5 py-3 text-fg-muted">
                  {p.Tags ? (
                    <div className="flex flex-wrap gap-1">
                      {p.Tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                        <Link
                          key={t}
                          href={`/user/problems?tag=${encodeURIComponent(t)}${sp.view === "mine" ? "&view=mine" : ""}`}
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
                {isStaff && (
                  <td className="px-5 py-3">
                    {p.Status !== "Public" ? (
                      <ProblemStatusBadge value={p.Status} />
                    ) : (
                      <span className="text-fg-muted text-sm">Công khai</span>
                    )}
                  </td>
                )}
                <td className="px-5 py-3">{p.AcRate}%</td>
                <td className="px-5 py-3">
                  <UserStatusBadge value={p.UserStatus} />
                </td>
                {sp.view === "mine" && (
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/user/problems/${p.ProblemID}/edit`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Chi tiết
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={sp.view === "mine" ? (isStaff ? 9 : 8) : (isStaff ? 8 : 7)} className="px-5 py-12 text-center text-fg-muted">
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
