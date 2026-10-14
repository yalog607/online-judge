import { Select } from "@/components/select";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { listForManage, listForUser } from "@/modules/problem/repo";
import { DifficultyBadge, UserStatusBadge, ProblemStatusBadge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { RowActions } from "../../teacher/problems/row-actions";
import { NotificationBanner } from "@/components/notification-banner";

const PAGE_SIZE = 20;

export default async function ProblemListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (user.role === "Teacher" || user.role === "Admin") {
    const spRecord = await searchParams;
    const queryString = new URLSearchParams(spRecord as Record<string, string>).toString();
    redirect(queryString ? `/teacher/problems?${queryString}` : "/teacher/problems");
  }
  const isStaff = user.role === "TA";
  const canApprove = false;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const isApprovalView = canApprove && sp.view === "pending";

  const userResult = isApprovalView ? null : await listForUser({
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
  const approvalResult = isApprovalView ? await listForManage({
    actorId: user.userId,
    search: sp.q || undefined,
    tag: sp.tag || undefined,
    difficulty: (sp.difficulty || undefined) as never,
    status: "Pending",
    page,
    pageSize: PAGE_SIZE,
  }) : null;
  const rows = userResult?.rows ?? [];
  const approvalRows = approvalResult?.rows ?? [];
  const total = approvalResult?.total ?? userResult?.total ?? 0;
  const pendingCount = canApprove
    ? isApprovalView
      ? total
      : (await listForManage({ actorId: user.userId, status: "Pending", page: 1, pageSize: 1 })).total
    : 0;

  const buildHref = (p: number) => {
    const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
    return `/user/problems?${params.toString()}`;
  };

  const successMessage =
    sp.success === "created"
      ? sp.name
        ? isStaff
          ? `Đã tạo bài tập "${sp.name}" thành công! Bài tập đang chờ giảng viên duyệt.`
          : `Đã tạo bài tập "${sp.name}" thành công!`
        : "Đã tạo bài tập mới thành công!"
      : sp.success === "updated"
        ? sp.name
          ? `Đã cập nhật bài tập "${sp.name}" thành công!`
          : "Đã cập nhật bài tập thành công!"
        : undefined;

  return (
    <div className="flex flex-col gap-5 pt-8">
      {successMessage && <NotificationBanner message={successMessage} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isApprovalView ? "Bài tập chờ duyệt" : "Danh sách bài tập"}</h1>
          <p className="mt-1 text-fg-muted">
            {isApprovalView
              ? "Duyệt bài tập trợ giảng gửi lên từ các lớp bạn phụ trách."
              : "Chọn bài để luyện tập, lọc theo chủ đề và độ khó."}
          </p>
        </div>
        {isStaff && !isApprovalView && (
          <Link
            href="/user/problems/new"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:bg-primary/90"
          >
            + Tạo bài tập
          </Link>
        )}
      </div>

      {isStaff && (
        <nav aria-label="Danh sách bài tập" className="flex gap-5 border-b border-line pb-2">
          <Link 
            href="/user/problems" 
            className={`whitespace-nowrap pb-2 -mb-[9px] font-medium ${!isApprovalView && sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
          >
            Tất cả
          </Link>
          <Link 
            href="/user/problems?view=mine" 
            className={`whitespace-nowrap pb-2 -mb-[9px] font-medium ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
          >
            Bài tập của tôi
          </Link>
          {canApprove && (
            <Link
              href="/user/problems?view=pending"
              className={`inline-flex items-center gap-2 whitespace-nowrap pb-2 -mb-[9px] font-semibold ${isApprovalView ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
            >
              Chờ duyệt
              {pendingCount > 0 && (
                <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${isApprovalView ? 'bg-primary text-primary-fg' : 'bg-warn-soft text-warn'}`}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          )}
        </nav>
      )}

      <form key={new URLSearchParams(sp as Record<string, string>).toString()} className="flex gap-2.5 card p-2.5 overflow-x-auto items-center scrollbar-hide" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        {isApprovalView && <input type="hidden" name="view" value="pending" />}
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
        <Select
          name="difficulty"
          label="Độ khó"
          defaultValue={sp.difficulty ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="Easy">Dễ</option>
          <option value="Medium">Trung bình</option>
          <option value="Hard">Khó</option>
        </Select>
        {isStaff && !isApprovalView && (
          <Select
            name="problemStatus"
          label="Trạng thái bài"
            defaultValue={sp.problemStatus ?? ""}
            className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="Public">Công khai</option>
            <option value="Private">Riêng tư</option>
            <option value="Hidden">Đã khóa</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Rejected">Đã từ chối</option>
          </Select>
        )}
        { !isApprovalView && <Select
          name="status"
          label="Trạng thái giải"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-line bg-muted px-3 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="done">Đã giải</option>
          <option value="tried">Đã thử</option>
          <option value="todo">Chưa làm</option>
        </Select>}
        <button type="submit" className="shrink-0 rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg text-sm">
          Tìm kiếm
        </button>
        <Link
          href={`/user/problems${isApprovalView ? "?view=pending" : sp.view === "mine" ? "?view=mine" : ""}`}
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

      {isApprovalView ? (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] table-fixed text-sm">
            <colgroup>
              <col className="w-[72px]" />
              <col className="w-[260px]" />
              <col className="w-[175px]" />
              <col className="w-[200px]" />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
              <col className="w-[400px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-line bg-muted text-left font-medium text-fg-muted">
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
              {approvalRows.map((p, i) => (
                <tr key={p.ProblemID} className="align-middle transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap px-5 py-4 text-fg-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-5 py-4 font-medium">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link href={`/teacher/problems/${p.ProblemID}`} className="truncate hover:underline" title={p.Title}>{p.Title}</Link>
                      <span className="shrink-0 rounded border border-line/50 bg-muted px-1.5 py-0.5 text-[10px] font-normal text-fg-muted">#{p.ProblemID}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-fg-muted">{p.CreatorFullName ?? "-"}</td>
                  <td className="px-5 py-4 text-fg-muted">
                    {p.Tags ? <div className="flex flex-wrap gap-1">{[...new Set(p.Tags.split(",").map((t) => t.trim()).filter(Boolean))].map((tag) => <span key={tag} className="rounded border border-line/50 bg-muted px-1.5 py-0.5 text-xs">{tag}</span>)}</div> : "-"}
                  </td>
                  <td className="px-5 py-4"><DifficultyBadge value={p.Difficulty} /></td>
                  <td className="px-5 py-4"><ProblemStatusBadge value={p.Status} /></td>
                  <td className="px-5 py-4 text-right">
                    <RowActions problemId={p.ProblemID} status={p.Status} proposedStatus={p.ProposedStatus} actorRole={user.role} canManage={p.CanManage} />
                  </td>
                </tr>
              ))}
              {approvalRows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-14 text-center"><p className="font-medium text-fg">Không có bài tập đang chờ duyệt</p><p className="mt-1 text-sm text-fg-muted">Bài trợ giảng gửi từ lớp bạn phụ trách sẽ xuất hiện ở đây.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </div>
      ) : <div className="card">
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
              {(isStaff || sp.view === "mine") && <th className="px-5 py-3 text-right">Thao tác</th>}
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
                {(isStaff || sp.view === "mine") && (
                  <td className="px-5 py-3 text-right">
                    {p.CreatorID === user.userId ? (
                      <Link
                        href={`/user/problems/${p.ProblemID}/edit`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Sửa
                      </Link>
                    ) : (
                      <span className="text-fg-muted text-xs">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isStaff ? 9 : 8} className="px-5 py-12 text-center text-fg-muted">
                  Không có bài tập nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
      </div>
      }
    </div>
  );
}
