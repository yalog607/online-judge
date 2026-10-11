import { Select } from "@/components/select";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { contestRepository } from "@/modules/contest/repo";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { CreateContestDialog } from "./create-contest-dialog";
import { DeleteContestDialog } from "./delete-contest-dialog";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: "Upcoming" | "Ongoing" | "Ended" }) {
  if (status === "Ongoing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Đang diễn ra
      </span>
    );
  }
  if (status === "Upcoming") {
    return (
      <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20">
        Sắp diễn ra
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-fg-muted border border-line">
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
  const selectedClassId = sp.classId ? Number(sp.classId) : undefined;
  const joinedView = sp.view === "joined";

  const [{ items: contests, total }, { classes }] = await Promise.all([
    contestRepository.listContests({
      status: statusParam,
      classId: selectedClassId,
      search: sp.q,
      page,
      pageSize: PAGE_SIZE,
      userId: actor.userId,
      onlyMine: sp.view === "mine",
      onlyJoined: joinedView,
    }),
    classRepository.listClasses({
      userId: actor.userId,
      onlyMine: actor.role === "Teacher",
      page: 1,
      pageSize: 100,
    }),
  ]);

  const classOptions = classes.map((c) => ({
    classId: c.ClassID,
    className: c.ClassName,
  }));

  const startRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">Danh sách kỳ thi</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Quản lý các kỳ thi bạn tổ chức.
          </p>
        </div>
        <CreateContestDialog classes={classOptions} />
      </div>

      <form className="card p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3" method="get">
        {sp.view && <input type="hidden" name="view" value={sp.view} />}
        <div className="relative flex-1 w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm theo tên kỳ thi, mã kỳ thi..."
            className="w-full rounded-lg border border-line bg-muted/40 pl-9 pr-3 py-2 text-xs sm:text-sm text-fg outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            name="classId"
          label="Môn học"
            defaultValue={sp.classId ?? ""}
            className="w-full md:w-auto rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs sm:text-sm text-fg outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">Tất cả</option>
            {classOptions.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </Select>

          <Select
            name="status"
          label="Trạng thái"
            defaultValue={statusParam}
            className="w-full md:w-auto rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs sm:text-sm text-fg outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="All">Tất cả</option>
            <option value="Ongoing">Đang diễn ra</option>
            <option value="Upcoming">Sắp diễn ra</option>
            <option value="Ended">Đã kết thúc</option>
          </Select>

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-fg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Tìm
          </button>
        </div>
      </form>

      {sp.classId && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">Đang lọc theo lớp:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary border border-primary/20">
            {classOptions.find((c) => String(c.classId) === sp.classId)?.className || `Lớp #${sp.classId}`}
            <Link
              href={(() => {
                const params = new URLSearchParams(sp as Record<string, string>);
                params.delete("classId");
                return `/teacher/contests?${params.toString()}`;
              })()}
              className="hover:opacity-75 font-bold ml-1"
            >
              ✕
            </Link>
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-muted/40 text-fg-muted text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 w-14">STT</th>
              <th className="px-4 py-3 w-24">MÃ</th>
              <th className="px-4 py-3">TÊN KỲ THI</th>
              <th className="px-4 py-3 w-48">MÔN</th>
              <th className="px-4 py-3 w-36">NGÀY THI</th>
              <th className="px-4 py-3 w-32">TRẠNG THÁI</th>
              <th className="px-4 py-3 w-24 text-right">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {contests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-fg-muted">
                  Không tìm thấy kỳ thi nào phù hợp.
                </td>
              </tr>
            ) : (
              contests.map((c, idx) => {
                const canManage = actor.role === "Admin" || c.creatorId === actor.userId;
                const detailHref = `/teacher/contests/${c.contestId}`;
                const code = `KT${String(c.contestId).padStart(3, "0")}`;

                return (
                  <tr key={c.contestId} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-fg-muted">
                      {code}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      <div className="flex items-center gap-2">
                        <Link
                          href={detailHref}
                          className="hover:underline font-semibold text-fg hover:text-primary transition-colors"
                        >
                          {c.contestName}
                        </Link>
                        {c.isProtected && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                            Mật khẩu
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
                        {c.creatorId !== actor.userId && (
                          <span>Bởi {c.creatorName}</span>
                        )}
                        {c.description && (
                          <span className="line-clamp-1">{c.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-fg">
                      {c.className ? (
                        <span className="text-primary">{c.className}</span>
                      ) : (
                        <span className="text-fg-muted">Chung</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg">
                      <div className="font-medium">{formatDate(c.startTime)}</div>
                      <div className="text-[11px] text-fg-muted">
                        {formatTime(c.startTime)} - {formatTime(c.endTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage ? (
                          <Link
                            href={detailHref}
                            className="p-1.5 text-fg-muted hover:text-primary rounded-md hover:bg-muted transition-colors"
                            title="Quản lý kỳ thi"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </Link>
                        ) : (
                          <Link
                            href={detailHref}
                            className="p-1.5 text-fg-muted hover:text-primary rounded-md hover:bg-muted transition-colors"
                            title="Xem chi tiết kỳ thi"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                        )}
                        {canManage && (
                          <DeleteContestDialog
                            contestId={c.contestId}
                            contestName={c.contestName}
                            variant="icon"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-fg-muted">
            <div>
              Hiển thị {startRecord} - {endRecord} trong tổng số {total} kỳ thi
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
        )}
      </div>
    </div>
  );
}
