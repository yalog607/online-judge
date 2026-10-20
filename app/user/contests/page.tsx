import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { Pager } from "@/components/pager";
import { ContestStatusBadge } from "@/components/badge";
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
  const isMineView = user.role === "Admin" && sp.view === "mine";
  const joinedView = sp.view === "joined";

  const { items: contests, total } = await contestRepository.listContests({
    status: statusParam,
    search: sp.q,
    page,
    pageSize: PAGE_SIZE,
    userId: user.userId,
    onlyMine: isMineView,
    onlyJoined: joinedView,
  });

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

        <form className="flex items-center gap-2" method="get">
          <input type="hidden" name="status" value={statusParam} />
          {sp.view && <input type="hidden" name="view" value={sp.view} />}
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm theo tên kỳ thi..."
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90"
          >
            Tìm
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {detailedContests.length === 0 ? (
          <EmptyState>{joinedView ? "Bạn chưa tham gia kỳ thi nào phù hợp." : "Không tìm thấy kỳ thi nào phù hợp."}</EmptyState>
        ) : (
          detailedContests.map((c) => (
            <div
              key={c.contestId}
              className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={getHref(c.contestId)}
                        className="font-bold text-base text-fg hover:text-primary transition-colors"
                      >
                        {c.contestName}
                      </Link>
                      {c.isProtected && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                          Mật khẩu
                        </span>
                      )}
                    </div>
                    {c.className && (
                      <span className="mt-1 inline-block text-xs font-medium text-primary">
                        Lớp: {c.className}
                      </span>
                    )}
                  </div>
                  <ContestStatusBadge status={c.status} />
                </div>

                {c.description && (
                  <p className="mt-2 text-xs text-fg-muted line-clamp-2">{c.description}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-fg-muted bg-muted/40 p-3 rounded-xl border border-line/60">
                  <div>
                    <span className="block text-[11px] text-fg-subtle">Bắt đầu:</span>
                    <span className="font-medium text-fg">{formatDateTime(c.startTime)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-fg-subtle">Kết thúc:</span>
                    <span className="font-medium text-fg">{formatDateTime(c.endTime)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-fg-subtle">Đề thi:</span>
                    <span className="font-medium text-fg">{c.problemCount} bài tập</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-fg-subtle">Thí sinh:</span>
                    <span className="font-medium text-fg">{c.participantCount} người tham gia</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-3 border-t border-line">
                <span className="text-xs text-fg-muted">Tạo bởi: {c.creatorName}</span>
                {c.isJoined ? (
                  <Link
                    href={`/user/contests/${c.contestId}`}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-opacity ${
                      c.status === "Ended"
                        ? "border border-line bg-surface text-fg-muted hover:text-fg hover:bg-muted"
                        : "bg-primary text-primary-fg hover:opacity-90"
                    }`}
                  >
                    {c.status === "Ended" ? "Xem kết quả →" : "Vào phòng thi →"}
                  </Link>
                ) : c.status === "Ended" ? (
                  <Link
                    href={`/user/contests/${c.contestId}`}
                    className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg hover:bg-muted transition-colors"
                  >
                    Xem chi tiết →
                  </Link>
                ) : (
                  <JoinContestDialog
                    contestId={c.contestId}
                    contestName={c.contestName}
                    isProtected={c.isProtected}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
