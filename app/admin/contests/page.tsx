import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { DataTable } from "@/components/data-table";
import { ContestStatusBadge } from "@/components/badge";

const PAGE_SIZE = 20;

function formatDateTime(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function AdminContestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const statusParam = (sp.status as "Upcoming" | "Ongoing" | "Ended" | "All") || "All";
  const selectedClassId = sp.classId ? Number(sp.classId) : undefined;

  const [{ items: contests, total }, { classes }] = await Promise.all([
    contestRepository.listContests({
      status: statusParam,
      classId: selectedClassId,
      search: sp.q,
      page,
      pageSize: PAGE_SIZE,
      userId: actor.userId,
      onlyMine: false,
    }),
    classRepository.listClasses({
      userId: actor.userId,
      onlyMine: false,
      page: 1,
      pageSize: 100,
    }),
  ]);

  const classOptions = classes.map((c) => ({
    classId: c.ClassID,
    className: c.ClassName,
  }));

  const tabs = [
    { label: "Tất cả", value: "All" },
    { label: "Đang diễn ra", value: "Ongoing" },
    { label: "Sắp diễn ra", value: "Upcoming" },
    { label: "Đã kết thúc", value: "Ended" },
  ];

  return (
    <div className="flex flex-col gap-6 pt-8">
      <PageHeader
        title="Danh sách kỳ thi"
        badge={
          <span className="rounded-full border border-line bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            Chỉ xem
          </span>
        }
        description="Theo dõi danh sách và kết quả các kỳ thi trong hệ thống (không chỉnh sửa)."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 card p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = statusParam === tab.value;
            const params = new URLSearchParams({ ...sp, status: tab.value, page: "1" } as Record<
              string,
              string
            >);
            return (
              <Link
                key={tab.value}
                href={`/admin/contests?${params.toString()}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-fg"
                    : "text-fg-muted hover:bg-muted hover:text-fg"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <form className="flex flex-wrap items-center gap-2" method="get">
          <input type="hidden" name="status" value={statusParam} />
          <select
            name="classId"
            defaultValue={sp.classId ?? ""}
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
          >
            <option value="">Lớp học (Tất cả)</option>
            {classOptions.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm theo mã hoặc tên kỳ thi..."
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 transition-opacity"
          >
            Tìm
          </button>
          <Link
            href="/admin/contests"
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted/80 transition-colors"
          >
            Xóa lọc
          </Link>
        </form>
      </div>

      {sp.classId && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">Đang lọc theo lớp:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary border border-primary/20">
            {classOptions.find((c) => String(c.classId) === sp.classId)?.className ||
              `Lớp #${sp.classId}`}
            <Link
              href={(() => {
                const params = new URLSearchParams(sp as Record<string, string>);
                params.delete("classId");
                return `/admin/contests?${params.toString()}`;
              })()}
              className="hover:opacity-75 font-bold ml-1"
            >
              ✕
            </Link>
          </span>
        </div>
      )}

      <DataTable
        columns={[
          { label: "Mã" },
          { label: "Tên kỳ thi" },
          { label: "Trạng thái" },
          { label: "Thời gian" },
          { label: "Phạm vi" },
          { label: "Đề thi / Thí sinh" },
          { label: "Thao tác", align: "right" },
        ]}
      >
        {contests.length === 0 ? (
          <EmptyState variant="cell" colSpan={7}>
            Không tìm thấy kỳ thi nào phù hợp.
          </EmptyState>
        ) : (
          contests.map((c) => (
            <tr key={c.contestId} className="hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-fg-muted whitespace-nowrap">{c.contestCode}</td>
              <td className="px-4 py-3 font-medium text-fg">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/contests/${c.contestId}`}
                    className="hover:underline font-semibold"
                  >
                    {c.contestName}
                  </Link>
                  {c.isProtected && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                      Mật khẩu
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="mt-0.5 text-xs text-fg-muted line-clamp-1">{c.description}</p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <ContestStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">
                <div>{formatDateTime(c.startTime)}</div>
                <div className="text-[11px] text-fg-subtle">đến {formatDateTime(c.endTime)}</div>
              </td>
              <td className="px-4 py-3 text-xs">
                {c.className && c.classId ? (
                  <Link
                    href={`/admin/contests?classId=${c.classId}${statusParam !== "All" ? `&status=${statusParam}` : ""}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.className}
                  </Link>
                ) : (
                  <span className="text-fg-muted">Công khai</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">
                <div>{c.problemCount} bài tập</div>
                <div className="text-[11px]">{c.participantCount} thí sinh</div>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/contests/${c.contestId}`}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                >
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))
        )}
      </DataTable>

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => {
          const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
          return `/admin/contests?${params.toString()}`;
        }}
      />
    </div>
  );
}
