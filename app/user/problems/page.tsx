import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { listForUser } from "@/modules/problem/repo";
import { DifficultyBadge, UserStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";

const PAGE_SIZE = 20;

export default async function ProblemListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listForUser({
    userId: user.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: sp.difficulty as never,
    userStatus: sp.status as never,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/user/problems?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">Danh sách bài tập</h1>
        <p className="mt-1 text-fg-muted">Chọn bài để luyện tập, lọc theo chủ đề và độ khó.</p>
      </div>

      <form className="flex flex-wrap gap-3 rounded-xl bg-surface p-3" method="get">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm kiếm tên bài tập..."
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-muted px-3 py-2"
        />
        <select
          name="difficulty"
          defaultValue={sp.difficulty ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2"
        >
          <option value="">Độ khó (Tất cả)</option>
          <option value="Easy">Dễ</option>
          <option value="Medium">Trung bình</option>
          <option value="Hard">Khó</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2"
        >
          <option value="">Trạng thái (Tất cả)</option>
          <option value="done">Đã giải</option>
          <option value="tried">Đã thử</option>
          <option value="todo">Chưa làm</option>
        </select>
        <button type="submit" className="rounded-lg bg-fg px-4 py-2 font-medium text-bg">
          Tìm kiếm
        </button>
      </form>

      <div className="rounded-xl bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-sm text-fg-muted">
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Tên bài</th>
              <th className="px-5 py-3">Chủ đề</th>
              <th className="px-5 py-3">Độ khó</th>
              <th className="px-5 py-3">Tỉ lệ AC</th>
              <th className="px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.ProblemID} className="border-b border-line last:border-0 hover:bg-muted">
                <td className="px-5 py-3">{p.ProblemID}</td>
                <td className="px-5 py-3">
                  <Link
                    href={`/user/problems/${p.ProblemID}`}
                    className="font-medium hover:underline"
                  >
                    {p.Title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-fg-muted">{p.Tags}</td>
                <td className="px-5 py-3">
                  <DifficultyBadge value={p.Difficulty} />
                </td>
                <td className="px-5 py-3">{p.AcRate}%</td>
                <td className="px-5 py-3">
                  <UserStatusBadge value={p.UserStatus} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
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
