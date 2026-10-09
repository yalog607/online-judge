import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { CreateContestDialog } from "./create-contest-dialog";

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: "Upcoming" | "Ongoing" | "Ended" }) {
  if (status === "Ongoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Đang diễn ra
      </span>
    );
  }
  if (status === "Upcoming") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
        Sắp diễn ra
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400 border border-slate-500/20">
      Đã kết thúc
    </span>
  );
}

export default async function TeacherContestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const statusParam = (sp.status as "Upcoming" | "Ongoing" | "Ended" | "All") || "All";

  const [{ items: contests, total }, { classes }] = await Promise.all([
    contestRepository.listContests({
      status: statusParam,
      search: sp.q,
      page,
      pageSize: PAGE_SIZE,
      userId: actor.userId,
      onlyMine: sp.view === "mine",
    }),
    classRepository.listClasses({
      userId: actor.userId,
      onlyMine: true,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Quản lý kỳ thi</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Tạo và tổ chức các kỳ thi, kiểm tra định kỳ cho học sinh.
          </p>
        </div>
        <CreateContestDialog classes={classOptions} />
      </div>

      <div className="flex gap-4 border-b border-line pb-2">
        <Link 
          href={`/teacher/contests?status=${statusParam}`} 
          className={`font-medium pb-2 -mb-[9px] ${sp.view !== 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Tất cả
        </Link>
        <Link 
          href={`/teacher/contests?view=mine&status=${statusParam}`} 
          className={`font-medium pb-2 -mb-[9px] ${sp.view === 'mine' ? 'border-b-2 border-primary text-primary' : 'text-fg-muted hover:text-fg'}`}
        >
          Kỳ thi của tôi
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = statusParam === tab.value;
            const params = new URLSearchParams({ ...sp, status: tab.value, page: "1" } as Record<string, string>);
            return (
              <Link
                key={tab.value}
                href={`/teacher/contests?${params.toString()}`}
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

        <form className="flex items-center gap-2" method="get">
          {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
          <input type="hidden" name="status" value={statusParam} />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm theo tên kỳ thi..."
            className="rounded-lg border border-line bg-muted px-3 py-1.5 text-xs text-fg outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-fg px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90"
          >
            Tìm
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-surface overflow-hidden border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-muted text-fg-muted font-medium">
            <tr>
              <th className="px-4 py-3">Tên kỳ thi</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Phạm vi</th>
              <th className="px-4 py-3">Đề thi / Thí sinh</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {contests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-fg-muted">
                  Không tìm thấy kỳ thi nào phù hợp.
                </td>
              </tr>
            ) : (
              contests.map((c) => (
                <tr key={c.contestId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/contests/${c.contestId}`}
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
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    <div>{formatDateTime(c.startTime)}</div>
                    <div className="text-[11px] text-fg-subtle">đến {formatDateTime(c.endTime)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.className ? (
                      <span className="font-medium text-primary">{c.className}</span>
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
                      href={`/teacher/contests/${c.contestId}`}
                      className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-muted transition-colors"
                    >
                      Quản lý
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        buildHref={(p) => {
          const params = new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>);
          return `/teacher/contests?${params.toString()}`;
        }}
      />
    </div>
  );
}
