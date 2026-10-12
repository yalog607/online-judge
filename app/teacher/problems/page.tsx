import { Select } from "@/components/select";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { listForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { RowActions } from "./row-actions";

import { NotificationBanner } from "@/components/notification-banner";

const PAGE_SIZE = 20;

export default async function ManageProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const successMessage =
    sp.success === "created"
      ? sp.name
        ? `Đã tạo bài tập "${sp.name}" thành công!`
        : "Đã tạo bài tập mới thành công!"
      : sp.success === "cloned"
        ? sp.name
          ? `Đã nhân bản bài tập thành "${sp.name}" thành công!`
          : "Đã nhân bản bài tập thành công!"
      : sp.success === "updated"
        ? sp.name
          ? `Đã cập nhật bài tập "${sp.name}" thành công!`
          : "Đã cập nhật bài tập thành công!"
        : undefined;

  const { rows, total } = await listForManage({
    actorId: actor.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: (sp.difficulty || undefined) as never,
    status: (sp.status || undefined) as never,
    page,
    pageSize: PAGE_SIZE,
    ownerOnly: sp.view === "mine",
  });
  const pendingTotal = sp.status === "Pending"
    ? total
    : (await listForManage({
        actorId: actor.userId,
        status: "Pending",
        page: 1,
        pageSize: 1,
      })).total;

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/teacher/problems?${params.toString()}`;
  };
  const buildTagHref = (tag: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value && key !== "page") params.set(key, value);
    }
    params.set("tag", tag);
    return `/teacher/problems?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 pt-8">
      {successMessage && <NotificationBanner message={successMessage} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ngân hàng bài tập</h1>
          <p className="mt-1 text-fg-muted">Quản lý kho bài tập dùng chung, nhân bản bài mẫu, lọc theo chủ đề, độ khó và trạng thái để giao cho lớp học hoặc kỳ thi.</p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:opacity-90 transition-opacity"
        >
          + Tạo bài tập
        </Link>
      </div>

      <nav aria-label="Lọc danh sách bài tập" className="flex gap-5 border-b border-line pb-2">
        <Link 
          href="/teacher/problems" 
          className={`whitespace-nowrap pb-2 -mb-[9px] font-medium ${sp.status !== 'Pending' && sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Tất cả
        </Link>
        <Link 
          href="/teacher/problems?view=mine" 
          className={`whitespace-nowrap pb-2 -mb-[9px] font-medium ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Bài tập của tôi
        </Link>
        <Link 
          href="/teacher/problems?status=Pending" 
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-1 pb-2 font-semibold transition-colors ${sp.status === 'Pending' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:border-primary/40 hover:text-fg'}`}
        >
          Chờ duyệt
          {pendingTotal > 0 && (
            <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${sp.status === 'Pending' ? 'bg-primary text-primary-fg' : 'bg-warn-soft text-warn'}`}>
              {pendingTotal > 99 ? "99+" : pendingTotal}
            </span>
          )}
        </Link>
      </nav>

      <form key={new URLSearchParams(sp as Record<string, string>).toString()} className="card grid grid-cols-1 items-center gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(10rem,0.7fr)_minmax(11rem,0.8fr)_minmax(12rem,0.9fr)_auto_auto]" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm kiếm tên bài tập..."
          className="min-w-0 rounded-lg border border-line bg-muted px-3 py-2.5 text-sm"
        />
        <input
          name="tag"
          defaultValue={sp.tag}
          placeholder="Chủ đề (tag)..."
          className="min-w-0 rounded-lg border border-line bg-muted px-3 py-2.5 text-sm"
        />
        <Select
          name="difficulty"
          label="Độ khó"
          defaultValue={sp.difficulty ?? ""}
          className="min-w-0 rounded-lg border border-line bg-muted px-3 py-2.5 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="Easy">Dễ</option>
          <option value="Medium">Trung bình</option>
          <option value="Hard">Khó</option>
        </Select>
        <Select
          name="status"
          label="Trạng thái bài"
          defaultValue={sp.status ?? ""}
          className="min-w-0 rounded-lg border border-line bg-muted px-3 py-2.5 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="Public">Công khai</option>
          <option value="Private">Riêng tư</option>
          <option value="Hidden">Đã khóa</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Rejected">Đã từ chối</option>
        </Select>
        <button type="submit" className="shrink-0 rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg text-sm hover:opacity-90 transition-opacity">
          Tìm kiếm
        </button>
        <Link
          href={`/teacher/problems${sp.view === "mine" ? "?view=mine" : ""}`}
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
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <colgroup>
            <col className="w-16" />
            <col className="w-[230px]" />
            <col className="w-[170px]" />
            <col className="w-[190px]" />
            <col className="w-[125px]" />
            <col className="w-[210px]" />
            <col className="w-[360px]" />
          </colgroup>
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
              <tr key={p.ProblemID} className="align-middle transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-5 py-4 text-fg-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-5 py-4 font-medium">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link href={`/teacher/problems/${p.ProblemID}`} className="truncate hover:underline" title={p.Title}>
                      {p.Title}
                    </Link>
                    <span className="text-[10px] text-fg-muted font-normal px-1.5 py-0.5 bg-muted rounded border border-line/50">#{p.ProblemID}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-fg-muted">{p.CreatorFullName ?? "-"}</td>
                <td className="px-5 py-4 text-fg-muted">
                  {p.Tags ? (
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(p.Tags.split(",").map((t) => t.trim()).filter(Boolean))].map((t) => (
                        <Link
                          key={t}
                          href={buildTagHref(t)}
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
                <td className="px-5 py-4">
                  <DifficultyBadge value={p.Difficulty} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col items-start gap-1.5">
                    <ProblemStatusBadge value={p.Status} />
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end">
                    <RowActions 
                      problemId={p.ProblemID} 
                      problemTitle={p.Title}
                      status={p.Status} 
                      proposedStatus={p.ProposedStatus}
                      actorRole={actor.role}
                      canManage={p.CanManage}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <p className="font-medium text-fg">Chưa có bài tập phù hợp</p>
                  <p className="mt-1 text-sm text-fg-muted">Thử đổi bộ lọc hoặc tạo bài tập mới.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </div>
    </div>
  );
}

