import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { ContestStatusBadge } from "@/components/badge";
import { DataTable } from "@/components/data-table";
import { Select } from "@/components/select";
import { JoinContestDialog } from "./join-contest-dialog";

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
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

export default async function UserContestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (user.role === "Teacher") redirect("/teacher/contests");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const statusParam = (sp.status as "Upcoming" | "Ongoing" | "Ended" | "All") || "All";
  const selectedClassId = sp.classId ? Number(sp.classId) : undefined;
  const isMineView = user.role === "Admin" && sp.view === "mine";
  const joinedView = sp.view === "joined";

  const [{ items: contests, total }, { classes }] = await Promise.all([
    contestRepository.listContests({
      status: statusParam,
      classId: selectedClassId,
      search: sp.q,
      page,
      pageSize: PAGE_SIZE,
      userId: user.userId,
      onlyMine: isMineView,
      onlyJoined: joinedView,
    }),
    classRepository.listClasses({ userId: user.userId, onlyMine: true, page: 1, pageSize: 500 }),
  ]);
  const classOptions = classes.map((item) => ({ classId: item.ClassID, className: item.ClassName }));

  // Số kỳ thi hiển thị trên các tab (không phụ thuộc bộ lọc đang chọn).
  const countFor = async (view: "mine" | "joined") =>
    (
      await contestRepository.listContests({
        status: "All",
        page: 1,
        pageSize: 1,
        userId: user.userId,
        onlyMine: view === "mine",
        onlyJoined: view === "joined",
      })
    ).total;
  const [mineCount, joinedCount] = await Promise.all([
    user.role === "Admin" ? countFor("mine") : Promise.resolve(0),
    countFor("joined"),
  ]);

  const detailedContests = await Promise.all(
    contests.map(async (c) => {
      const detail = await contestRepository.getContest(c.contestId, user.userId);
      return detail ?? c;
    })
  );

  const getHref = (contestId: number) => {
    return `/user/contests/${contestId}`;
  };

  const tabs = [
    { label: "Tất cả", value: "All" },
    { label: "Đang diễn ra", value: "Ongoing" },
    { label: "Sắp diễn ra", value: "Upcoming" },
    { label: "Đã kết thúc", value: "Ended" },
  ];
  const currentParams = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value !== undefined) params.set(key, value);
    }
    return params;
  };
  const joinedParams = currentParams();
  joinedParams.set("view", "joined");
  joinedParams.set("status", "All");
  joinedParams.set("page", "1");

  const mineParams = currentParams();
  mineParams.set("view", "mine");
  mineParams.set("status", "All");
  mineParams.set("page", "1");

  return (
    <div className="flex flex-col gap-6 pt-8">
      <PageHeader
        title="Kỳ thi trực tuyến"
        description="Tham gia các cuộc thi lập trình và bài kiểm tra đánh giá năng lực."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 card p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = !joinedView && !isMineView && statusParam === tab.value;
            const params = currentParams();
            params.delete("view");
            params.set("status", tab.value);
            params.set("page", "1");
            return (
              <Link
                key={tab.value}
                href={`/user/contests?${params.toString()}`}
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
          {user.role === "Admin" && (
            <Link
              href={`/user/contests?${mineParams.toString()}`}
              aria-current={isMineView ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isMineView
                  ? "bg-primary text-primary-fg"
                  : "text-fg-muted hover:bg-muted hover:text-fg"
              }`}
            >
              Kỳ thi của tôi<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">{mineCount}</span>
            </Link>
          )}
          <Link
            href={`/user/contests?${joinedParams.toString()}`}
            aria-current={joinedView ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              joinedView
                ? "bg-primary text-primary-fg"
                : "text-fg-muted hover:bg-muted hover:text-fg"
            }`}
          >
            Kỳ thi tôi tham gia<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">{joinedCount}</span>
          </Link>
        </div>

        <form className="flex flex-wrap items-center gap-2" method="get">
          <input type="hidden" name="status" value={statusParam} />
          {sp.view && <input type="hidden" name="view" value={sp.view} />}
          <Select name="classId" label="Lớp học" defaultValue={sp.classId ?? ""} className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary">
            <option value="">Tất cả lớp</option>
            {classOptions.map((item) => <option key={item.classId} value={item.classId}>{item.className}</option>)}
          </Select>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm theo mã hoặc tên kỳ thi..."
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90"
          >
            Tìm
          </button>
          <Link href={isMineView ? "/user/contests?view=mine" : joinedView ? "/user/contests?view=joined" : "/user/contests"} className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs font-semibold text-fg hover:bg-muted/80">
            Xóa lọc
          </Link>
        </form>
      </div>

      <DataTable minWidth={940} columns={[{ label: "Mã" }, { label: "Tên kỳ thi" }, { label: "Lớp / Người tạo" }, { label: "Thời gian" }, { label: "Đề thi / Thí sinh" }, { label: "Trạng thái" }, { label: "Thao tác", align: "right" }] }>
        {detailedContests.length === 0 ? (
          <EmptyState variant="cell" colSpan={7}>{joinedView ? "Bạn chưa tham gia kỳ thi nào phù hợp." : "Không tìm thấy kỳ thi nào phù hợp."}</EmptyState>
        ) : (
          detailedContests.map((c) => (
            <tr key={c.contestId} className="transition-colors hover:bg-muted/40">
              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-fg-muted">{c.contestCode}</td>
              <td className="px-5 py-3"><div className="flex items-center gap-2"><Link href={getHref(c.contestId)} className="font-semibold text-fg hover:underline">{c.contestName}</Link>{c.isProtected && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">Mật khẩu</span>}</div>{c.description && <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{c.description}</p>}</td>
              <td className="px-5 py-3 text-xs"><div className="font-medium text-primary">{c.className ?? "Công khai"}</div><div className="text-fg-muted">{c.creatorName}</div></td>
              <td className="px-5 py-3 text-xs text-fg-muted"><div>{formatDateTime(c.startTime)}</div><div>đến {formatDateTime(c.endTime)}</div></td>
              <td className="px-5 py-3 text-xs text-fg-muted"><div>{c.problemCount} bài tập</div><div>{c.participantCount} thí sinh</div></td>
              <td className="px-5 py-3"><ContestStatusBadge status={c.status} /></td>
              <td className="px-5 py-3 text-right">
                {c.isJoined ? (
                  <Link href={`/user/contests/${c.contestId}`} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted">{c.status === "Ended" ? "Xem kết quả" : "Vào phòng thi"}</Link>
                ) : c.status === "Ended" ? (
                  <Link href={`/user/contests/${c.contestId}`} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted">Xem chi tiết</Link>
                ) : (
                  <JoinContestDialog contestId={c.contestId} contestName={c.contestName} isProtected={c.isProtected} />
                )}
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
          const params = currentParams();
          params.set("page", String(p));
          return `/user/contests?${params.toString()}`;
        }}
      />
    </div>
  );
}
